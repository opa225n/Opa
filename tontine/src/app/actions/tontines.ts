"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireMembership, requireUser, writeAuditLog, ForbiddenError } from "@/lib/rbac";
import {
  createTontineSchema,
  inviteMemberSchema,
  recordPaymentSchema,
  type CreateTontineInput,
  type InviteMemberInput,
  type RecordPaymentInput,
} from "@/lib/validations/tontine";
import { buildRotativeCyclePlan, generateInvitationCode, recomputeContribution } from "@/lib/tontine-engine";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Création et cycle de vie de la tontine
// ---------------------------------------------------------------------------

export async function createTontineAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createTontineSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
  }
  const data: CreateTontineInput = parsed.data;

  const tontine = await prisma.tontine.create({
    data: {
      name: data.name,
      description: data.description,
      type: "ROTATIVE",
      status: "DRAFT",
      contributionAmountXof: data.contributionAmountXof,
      feeAmountXof: data.feeAmountXof,
      latePenaltyAmountXof: data.latePenaltyAmountXof,
      latePenaltyGraceDays: data.latePenaltyGraceDays,
      frequency: data.frequency,
      startDate: data.startDate,
      createdById: user.id,
      memberships: {
        create: {
          userId: user.id,
          role: "RESPONSABLE",
          status: "ACTIVE",
          displayOrder: 0,
        },
      },
    },
  });

  await writeAuditLog({
    tontineId: tontine.id,
    userId: user.id,
    action: "tontine.create",
    entityType: "Tontine",
    entityId: tontine.id,
  });

  revalidatePath("/tontines");
  return { ok: true, data: { id: tontine.id } };
}

export async function reorderMembersAction(
  tontineId: string,
  orderedMembershipIds: string[]
): Promise<ActionResult> {
  const { membership: actorMembership } = await requireMembership(tontineId, ["RESPONSABLE"]);

  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId } });
  if (tontine.status !== "DRAFT") {
    return fail("L'ordre des bénéficiaires ne peut plus être modifié librement après le démarrage.");
  }

  const activeMemberships = await prisma.tontineMembership.findMany({
    where: { tontineId, status: "ACTIVE" },
    select: { id: true },
  });
  const activeIds = new Set(activeMemberships.map((m) => m.id));
  if (
    orderedMembershipIds.length !== activeIds.size ||
    !orderedMembershipIds.every((id) => activeIds.has(id))
  ) {
    return fail("La liste d'ordre doit contenir exactement tous les membres actifs.");
  }

  await prisma.$transaction(
    orderedMembershipIds.map((id, index) =>
      prisma.tontineMembership.update({ where: { id }, data: { displayOrder: index } })
    )
  );

  await writeAuditLog({
    tontineId,
    userId: actorMembership.userId,
    action: "tontine.reorder_members",
    entityType: "Tontine",
    entityId: tontineId,
  });

  revalidatePath(`/tontines/${tontineId}/membres`);
  return { ok: true, data: undefined };
}

export async function startTontineAction(tontineId: string): Promise<ActionResult> {
  const { user } = await requireMembership(tontineId, ["RESPONSABLE"]);

  const tontine = await prisma.tontine.findUniqueOrThrow({
    where: { id: tontineId },
    include: { memberships: { where: { status: "ACTIVE" }, orderBy: { displayOrder: "asc" } } },
  });

  if (tontine.status !== "DRAFT") {
    return fail("Cette tontine a déjà démarré.");
  }
  if (tontine.memberships.length < 2) {
    return fail("Il faut au moins 2 membres actifs pour démarrer une tontine rotative.");
  }
  if (!tontine.contributionAmountXof || !tontine.startDate) {
    return fail("Montant de cotisation et date de démarrage requis.");
  }

  const orderedIds = tontine.memberships.map((m) => m.id);
  const plan = buildRotativeCyclePlan(tontine.startDate, tontine.frequency, orderedIds);
  const contributionAmountXof = tontine.contributionAmountXof;
  // Un membre à N bras cotise N fois le montant de base (+ frais, non multipliés) à chaque tour,
  // mais ne reçoit qu'un seul tour de bénéficiaire : le pot qu'il perçoit ce tour-là est la somme
  // des cotisations réellement dues par tous les membres, bras compris.
  const amountExpectedByMembershipId = new Map(
    tontine.memberships.map((m) => [
      m.id,
      contributionAmountXof * m.bras + tontine.feeAmountXof,
    ])
  );
  const potPerCycle = tontine.memberships.reduce(
    (sum, m) => sum + amountExpectedByMembershipId.get(m.id)!,
    0
  );

  const rulesContent = {
    montant: tontine.contributionAmountXof,
    frais: tontine.feeAmountXof,
    frequence: tontine.frequency,
    nombreDeTours: plan.length,
    ordreDesBeneficiaires: orderedIds,
    dateDemarrage: tontine.startDate,
    reglesDeRetard:
      tontine.latePenaltyAmountXof > 0
        ? `Un membre en retard reste dû tant que le paiement n'est pas confirmé. Passé un délai de grâce de ${tontine.latePenaltyGraceDays} jour(s) après l'échéance, une pénalité de ${tontine.latePenaltyAmountXof} FCFA s'ajoute au montant dû.`
        : "Un membre en retard reste dû tant que le paiement n'est pas confirmé.",
    conditionsEntreeSortie: "Un membre ne peut quitter la tontine qu'avec l'accord du responsable.",
    procedureContestation: "Toute contestation est à signaler via la page Opérations de la tontine.",
    reglesValidation: "Les paiements et versements sont confirmés par le responsable ou le trésorier.",
  };

  await prisma.$transaction(async (tx) => {
    const rules = await tx.tontineRules.create({
      data: { tontineId, version: 1, status: "ACTIVE", content: rulesContent },
    });

    for (const item of plan) {
      const cycle = await tx.tontineCycle.create({
        data: {
          tontineId,
          periodIndex: item.periodIndex,
          periodStart: item.periodStart,
          periodDue: item.periodDue,
          status: item.periodIndex === 1 ? "ACTIVE" : "PENDING",
        },
      });

      await tx.beneficiaryOrder.create({
        data: {
          tontineId,
          cycleId: cycle.id,
          membershipId: item.beneficiaryMembershipId,
          assignedMethod: "MANUAL",
          confirmedAt: new Date(),
        },
      });

      await tx.payout.create({
        data: {
          tontineId,
          cycleId: cycle.id,
          membershipId: item.beneficiaryMembershipId,
          // Convention de la tontine rotative classique : chaque membre cotise à chaque tour,
          // y compris le bénéficiaire du tour ; il reçoit donc la somme des cotisations dues
          // par tous les membres ce tour-là (bras compris).
          amountXof: potPerCycle,
          status: "PENDING",
          recordedById: user.id,
        },
      });

      await tx.contribution.createMany({
        data: tontine.memberships.map((m) => ({
          tontineId,
          cycleId: cycle.id,
          membershipId: m.id,
          amountExpectedXof: amountExpectedByMembershipId.get(m.id)!,
          status: "DUE" as const,
        })),
      });
    }

    await tx.rulesAcceptance.create({
      data: { rulesId: rules.id, userId: user.id, membershipId: tontine.memberships[0].id },
    });

    await tx.tontine.update({ where: { id: tontineId }, data: { status: "ACTIVE" } });
  });

  await writeAuditLog({
    tontineId,
    userId: user.id,
    action: "tontine.start",
    entityType: "Tontine",
    entityId: tontineId,
    metadata: { nombreDeTours: plan.length },
  });

  revalidatePath(`/tontines/${tontineId}`);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Membres et invitations
// ---------------------------------------------------------------------------

export async function inviteMemberAction(
  input: unknown
): Promise<ActionResult<{ code: string }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
  }
  const data: InviteMemberInput = parsed.data;
  const { user } = await requireMembership(data.tontineId, ["RESPONSABLE", "SECRETAIRE"]);

  const code = generateInvitationCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

  await prisma.invitation.create({
    data: {
      tontineId: data.tontineId,
      code,
      phone: data.phone && data.phone.length > 0 ? data.phone : null,
      role: data.role,
      expiresAt,
      invitedById: user.id,
    },
  });

  await writeAuditLog({
    tontineId: data.tontineId,
    userId: user.id,
    action: "invitation.create",
    entityType: "Invitation",
    entityId: code,
  });

  revalidatePath(`/tontines/${data.tontineId}/membres`);
  return { ok: true, data: { code } };
}

export async function addManagedMemberAction(
  tontineId: string,
  fullName: string
): Promise<ActionResult<{ membershipId: string }>> {
  const name = fullName.trim();
  if (name.length < 2) {
    return fail("Le nom doit contenir au moins 2 caractères.");
  }

  const { user: actor } = await requireMembership(tontineId, ["RESPONSABLE", "SECRETAIRE"]);

  const maxOrder = await prisma.tontineMembership.aggregate({
    where: { tontineId },
    _max: { displayOrder: true },
  });
  // Mot de passe aléatoire inutilisable : personne ne peut se connecter sur ce compte (en plus
  // de la garde explicite isManaged dans src/lib/auth.ts — défense en profondeur).
  const passwordHash = await bcrypt.hash(`${randomUUID()}:${randomUUID()}`, 12);

  const membership = await prisma.$transaction(async (tx) => {
    const managedUser = await tx.user.create({
      data: {
        fullName: name,
        phone: `managed:${randomUUID()}`,
        passwordHash,
        countryCode: "CI",
        phoneVerified: true,
        isManaged: true,
        managedByUserId: actor.id,
        termsAcceptedAt: new Date(),
        profile: { create: {} },
      },
    });

    return tx.tontineMembership.create({
      data: {
        tontineId,
        userId: managedUser.id,
        role: "MEMBRE",
        status: "ACTIVE",
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      },
    });
  });

  await writeAuditLog({
    tontineId,
    userId: actor.id,
    action: "member.add_managed",
    entityType: "TontineMembership",
    entityId: membership.id,
    metadata: { fullName: name },
  });

  revalidatePath(`/tontines/${tontineId}/membres`);
  return { ok: true, data: { membershipId: membership.id } };
}

export async function revokeInvitationAction(invitationId: string): Promise<ActionResult> {
  const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
  const { user } = await requireMembership(invitation.tontineId, ["RESPONSABLE", "SECRETAIRE"]);

  await prisma.invitation.update({ where: { id: invitationId }, data: { status: "REVOKED" } });
  await writeAuditLog({
    tontineId: invitation.tontineId,
    userId: user.id,
    action: "invitation.revoke",
    entityType: "Invitation",
    entityId: invitationId,
  });

  revalidatePath(`/tontines/${invitation.tontineId}/membres`);
  return { ok: true, data: undefined };
}

export async function acceptInvitationAction(code: string): Promise<ActionResult<{ tontineId: string }>> {
  const user = await requireUser();
  const invitation = await prisma.invitation.findUnique({ where: { code } });

  if (!invitation) return fail("Code d'invitation invalide.");
  if (invitation.status === "REVOKED") return fail("Cette invitation a été annulée.");
  if (invitation.status === "ACCEPTED") return fail("Cette invitation a déjà été utilisée.");
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return fail("Cette invitation a expiré. Demandez-en une nouvelle au responsable.");
  }

  const existingMembership = await prisma.tontineMembership.findUnique({
    where: { tontineId_userId: { tontineId: invitation.tontineId, userId: user.id } },
  });
  if (existingMembership) {
    if (existingMembership.status === "LEFT") {
      await prisma.tontineMembership.update({
        where: { id: existingMembership.id },
        data: { status: "ACTIVE", role: invitation.role, leftAt: null, leftReason: null },
      });
    }
    // sinon déjà membre actif : pas d'erreur, simple redirection.
  } else {
    const maxOrder = await prisma.tontineMembership.aggregate({
      where: { tontineId: invitation.tontineId },
      _max: { displayOrder: true },
    });
    await prisma.tontineMembership.create({
      data: {
        tontineId: invitation.tontineId,
        userId: user.id,
        role: invitation.role,
        status: "ACTIVE",
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      },
    });
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedByUserId: user.id },
  });

  await writeAuditLog({
    tontineId: invitation.tontineId,
    userId: user.id,
    action: "invitation.accept",
    entityType: "Invitation",
    entityId: invitation.id,
  });

  revalidatePath(`/tontines/${invitation.tontineId}/membres`);
  return { ok: true, data: { tontineId: invitation.tontineId } };
}

export async function removeMemberAction(
  membershipId: string,
  reason: string
): Promise<ActionResult> {
  const target = await prisma.tontineMembership.findUniqueOrThrow({ where: { id: membershipId } });
  const { user, membership: actor } = await requireMembership(target.tontineId, ["RESPONSABLE"]);

  if (target.id === actor.id) {
    return fail("Le responsable ne peut pas se retirer lui-même de la tontine.");
  }

  await prisma.tontineMembership.update({
    where: { id: membershipId },
    data: { status: "LEFT", leftAt: new Date(), leftReason: reason || "Non précisé" },
  });

  await writeAuditLog({
    tontineId: target.tontineId,
    userId: user.id,
    action: "member.remove",
    entityType: "TontineMembership",
    entityId: membershipId,
    metadata: { reason },
  });

  revalidatePath(`/tontines/${target.tontineId}/membres`);
  return { ok: true, data: undefined };
}

export async function updateMemberBrasAction(
  membershipId: string,
  bras: number
): Promise<ActionResult> {
  if (!Number.isInteger(bras) || bras < 1 || bras > 10) {
    return fail("Le nombre de bras doit être un entier entre 1 et 10.");
  }

  const target = await prisma.tontineMembership.findUniqueOrThrow({
    where: { id: membershipId },
    include: { tontine: true },
  });
  const { user } = await requireMembership(target.tontineId, ["RESPONSABLE"]);

  if (target.bras === bras) {
    return { ok: true, data: undefined };
  }
  if (target.tontine.contributionAmountXof == null) {
    return fail("Le montant de cotisation de la tontine n'est pas encore défini.");
  }

  const amountExpectedXof = target.tontine.contributionAmountXof * bras + target.tontine.feeAmountXof;

  await prisma.$transaction(async (tx) => {
    await tx.tontineMembership.update({ where: { id: membershipId }, data: { bras } });

    // On ne touche qu'aux cotisations futures/non commencées (aucun paiement confirmé) : les
    // cotisations déjà payées, même partiellement, restent inchangées pour ne pas perturber
    // l'historique financier.
    const affected = await tx.contribution.findMany({
      where: { membershipId, status: "DUE", amountConfirmedXof: 0 },
      select: { id: true, cycleId: true },
    });

    if (affected.length === 0) return;

    await tx.contribution.updateMany({
      where: { id: { in: affected.map((c) => c.id) } },
      data: { amountExpectedXof },
    });

    // Le pot de chaque tour concerné change avec la cotisation du membre : on recalcule le
    // versement correspondant, uniquement s'il n'a pas encore été confirmé/versé.
    const cycleIds = [...new Set(affected.map((c) => c.cycleId))];
    for (const cycleId of cycleIds) {
      const payout = await tx.payout.findUnique({ where: { cycleId } });
      if (!payout || payout.status !== "PENDING") continue;

      const contributions = await tx.contribution.findMany({
        where: { cycleId },
        select: { amountExpectedXof: true },
      });
      const potPerCycle = contributions.reduce((sum, c) => sum + c.amountExpectedXof, 0);

      await tx.payout.update({ where: { id: payout.id }, data: { amountXof: potPerCycle } });
    }
  });

  await writeAuditLog({
    tontineId: target.tontineId,
    userId: user.id,
    action: "member.update_bras",
    entityType: "TontineMembership",
    entityId: membershipId,
    metadata: { bras },
  });

  revalidatePath(`/tontines/${target.tontineId}/membres`);
  revalidatePath(`/tontines/${target.tontineId}/cotisations`);
  revalidatePath(`/tontines/${target.tontineId}/calendrier`);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Cotisations et paiements
// ---------------------------------------------------------------------------

export async function applyLatePenaltiesAction(
  tontineId: string
): Promise<ActionResult<{ count: number }>> {
  const { user } = await requireMembership(tontineId, ["RESPONSABLE", "TRESORIER"]);

  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId } });
  if (tontine.latePenaltyAmountXof <= 0) {
    return fail("Aucune pénalité de retard n'est configurée pour cette tontine.");
  }

  const cutoff = new Date(Date.now() - tontine.latePenaltyGraceDays * 24 * 60 * 60 * 1000);

  // Cotisations non confirmées, sans pénalité déjà appliquée, dont le délai de grâce après
  // l'échéance du tour est dépassé.
  const overdue = await prisma.contribution.findMany({
    where: {
      tontineId,
      status: { in: ["DUE", "PARTIAL"] },
      penaltyXof: 0,
      cycle: { periodDue: { lte: cutoff } },
    },
    select: { id: true },
  });

  if (overdue.length > 0) {
    await prisma.contribution.updateMany({
      where: { id: { in: overdue.map((c) => c.id) } },
      data: { penaltyXof: tontine.latePenaltyAmountXof, penaltyAppliedAt: new Date() },
    });
  }

  await writeAuditLog({
    tontineId,
    userId: user.id,
    action: "tontine.apply_late_penalties",
    entityType: "Tontine",
    entityId: tontineId,
    metadata: { count: overdue.length, amountXof: tontine.latePenaltyAmountXof },
  });

  revalidatePath(`/tontines/${tontineId}/cotisations`);
  return { ok: true, data: { count: overdue.length } };
}

export async function recordPaymentAction(
  input: unknown,
  mode: "SELF_DECLARE" | "MANUAL_RECORD"
): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
  }
  const data: RecordPaymentInput = parsed.data;

  const contribution = await prisma.contribution.findUniqueOrThrow({
    where: { id: data.contributionId },
    include: { membership: true },
  });

  const { user, membership: actor } = await requireMembership(contribution.tontineId);

  if (mode === "SELF_DECLARE") {
    if (contribution.membershipId !== actor.id) {
      return fail("Vous ne pouvez déclarer un paiement que pour votre propre cotisation.");
    }
  } else {
    if (!["RESPONSABLE", "TRESORIER"].includes(actor.role)) {
      throw new ForbiddenError("Seul le responsable ou le trésorier peut enregistrer un paiement manuel.");
    }
  }

  // Détection de doublon simple : même référence de transaction déjà utilisée sur cette tontine.
  if (data.transactionRef) {
    const duplicate = await prisma.payment.findFirst({
      where: {
        transactionRef: data.transactionRef,
        contribution: { tontineId: contribution.tontineId },
        status: { not: "CANCELLED" },
      },
    });
    if (duplicate) {
      return fail("Cette référence de transaction a déjà été utilisée pour un autre paiement.");
    }
  }

  const payment = await prisma.payment.create({
    data: {
      contributionId: data.contributionId,
      amountXof: data.amountXof,
      method: data.method,
      status: "DECLARED",
      isManualEntry: true,
      paidAt: data.paidAt,
      transactionRef: data.transactionRef,
      notes: data.notes,
      recordedById: user.id,
    },
  });

  await prisma.contribution.update({
    where: { id: data.contributionId },
    data: {
      status: contribution.status === "DUE" ? "DECLARED" : contribution.status,
    },
  });

  await writeAuditLog({
    tontineId: contribution.tontineId,
    userId: user.id,
    action: mode === "SELF_DECLARE" ? "payment.declare" : "payment.record_manual",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { amountXof: data.amountXof, method: data.method },
  });

  revalidatePath(`/tontines/${contribution.tontineId}/cotisations`);
  return { ok: true, data: undefined };
}

export async function confirmPaymentAction(paymentId: string): Promise<ActionResult> {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { contribution: true },
  });
  const { user } = await requireMembership(payment.contribution.tontineId, ["RESPONSABLE", "TRESORIER"]);

  if (payment.status === "CONFIRMED") return fail("Ce paiement est déjà confirmé.");
  if (payment.status === "CANCELLED" || payment.status === "REJECTED") {
    return fail("Ce paiement a été rejeté ou annulé et ne peut pas être confirmé.");
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "CONFIRMED", validatedById: user.id, validatedAt: new Date() },
  });
  await recomputeContribution(payment.contributionId);

  await prisma.notification.create({
    data: {
      userId: payment.recordedById,
      tontineId: payment.contribution.tontineId,
      type: "PAYMENT_CONFIRMED",
      title: "Paiement confirmé",
      body: `Votre paiement de la cotisation a été confirmé.`,
    },
  });

  await writeAuditLog({
    tontineId: payment.contribution.tontineId,
    userId: user.id,
    action: "payment.confirm",
    entityType: "Payment",
    entityId: paymentId,
  });

  revalidatePath(`/tontines/${payment.contribution.tontineId}/cotisations`);
  return { ok: true, data: undefined };
}

export async function rejectPaymentAction(paymentId: string, reason: string): Promise<ActionResult> {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { contribution: true },
  });
  const { user } = await requireMembership(payment.contribution.tontineId, ["RESPONSABLE", "TRESORIER"]);

  if (payment.status === "CONFIRMED") {
    return fail("Un paiement confirmé ne peut pas être rejeté : utilisez une opération de rectification.");
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "REJECTED", rejectionReason: reason, validatedById: user.id, validatedAt: new Date() },
  });
  await recomputeContribution(payment.contributionId);

  await prisma.notification.create({
    data: {
      userId: payment.recordedById,
      tontineId: payment.contribution.tontineId,
      type: "PAYMENT_REJECTED",
      title: "Paiement rejeté",
      body: `Votre paiement a été rejeté. Motif : ${reason}`,
    },
  });

  await writeAuditLog({
    tontineId: payment.contribution.tontineId,
    userId: user.id,
    action: "payment.reject",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { reason },
  });

  revalidatePath(`/tontines/${payment.contribution.tontineId}/cotisations`);
  return { ok: true, data: undefined };
}

export async function acceptRulesAction(rulesId: string): Promise<ActionResult> {
  const rules = await prisma.tontineRules.findUniqueOrThrow({ where: { id: rulesId } });
  const { user, membership } = await requireMembership(rules.tontineId);

  await prisma.rulesAcceptance.upsert({
    where: { rulesId_userId: { rulesId, userId: user.id } },
    create: { rulesId, userId: user.id, membershipId: membership.id },
    update: {},
  });

  revalidatePath(`/tontines/${rules.tontineId}/reglement`);
  return { ok: true, data: undefined };
}

export async function confirmPayoutAction(
  payoutId: string,
  input: { method: "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY"; transactionRef?: string; notes?: string }
): Promise<ActionResult> {
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  const { user } = await requireMembership(payout.tontineId, ["RESPONSABLE", "TRESORIER"]);

  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "CONFIRMED",
      method: input.method,
      transactionRef: input.transactionRef,
      notes: input.notes,
      confirmedAt: new Date(),
    },
  });

  const beneficiaryMembership = await prisma.tontineMembership.findUnique({
    where: { id: payout.membershipId },
  });
  if (beneficiaryMembership) {
    await prisma.notification.create({
      data: {
        userId: beneficiaryMembership.userId,
        tontineId: payout.tontineId,
        type: "PAYOUT_CONFIRMED",
        title: "Versement confirmé",
        body: `Votre versement de ${payout.amountXof.toLocaleString("fr-FR")} FCFA a été enregistré comme versé.`,
      },
    });
  }

  await writeAuditLog({
    tontineId: payout.tontineId,
    userId: user.id,
    action: "payout.confirm",
    entityType: "Payout",
    entityId: payoutId,
  });

  revalidatePath(`/tontines/${payout.tontineId}/operations`);
  return { ok: true, data: undefined };
}
