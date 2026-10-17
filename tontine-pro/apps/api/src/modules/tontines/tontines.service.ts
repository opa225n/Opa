import { randomUUID, randomInt } from "crypto";
import { prisma } from "../../common/prisma";
import { Errors } from "../../common/errors";
import { requireMembership, requirePresident } from "../../common/membership";
import { recordAudit } from "../audit/audit.service";
import { notify, notifyMany } from "../notifications/notifications.service";
import { launchCycle } from "../rounds/rounds.engine";

export interface CreateTontineInput {
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  startDate: string;
  maxMembers: number;
  gracePeriodHours?: number;
  penaltyType?: "fixed" | "percent";
  penaltyValue?: number;
  solidarityFeePct?: number;
}

export async function createTontine(userId: string, input: CreateTontineInput) {
  const tontine = await prisma.tontine.create({
    data: {
      name: input.name,
      description: input.description,
      contributionAmount: BigInt(input.contributionAmount),
      frequency: input.frequency,
      startDate: new Date(input.startDate),
      maxMembers: input.maxMembers,
      gracePeriodHours: input.gracePeriodHours ?? 24,
      penaltyRule: { type: input.penaltyType ?? "fixed", value: input.penaltyValue ?? 0 },
      solidarityFeePct: input.solidarityFeePct ?? 0,
      createdBy: userId,
      memberships: {
        create: {
          userId,
          role: "president",
          status: "active",
          joinedAt: new Date(),
          acceptedRulesAt: new Date(),
          rotationPosition: 1,
        },
      },
    },
    include: { memberships: true },
  });
  await recordAudit(tontine.id, userId, "tontine_created", { name: input.name });
  return tontine;
}

export async function listMyTontines(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "active" },
    include: {
      tontine: {
        include: {
          rounds: { where: { status: { in: ["open", "complete", "payout_pending"] } }, take: 1 },
          memberships: { where: { status: "active" } },
        },
      },
    },
    orderBy: { tontine: { createdAt: "desc" } },
  });
  return memberships.map((m) => ({
    id: m.tontine.id,
    name: m.tontine.name,
    status: m.tontine.status,
    role: m.role,
    memberCount: m.tontine.memberships.length,
    maxMembers: m.tontine.maxMembers,
    contributionAmount: m.tontine.contributionAmount,
    frequency: m.tontine.frequency,
    currentRound: m.tontine.rounds[0] ?? null,
  }));
}

export async function getTontineDetail(tontineId: string, userId: string) {
  await requireMembership(tontineId, userId);
  const tontine = await prisma.tontine.findUniqueOrThrow({
    where: { id: tontineId },
    include: {
      memberships: { include: { user: true }, orderBy: { rotationPosition: "asc" } },
      rounds: { orderBy: { roundNumber: "asc" }, include: { beneficiary: { include: { user: true } } } },
    },
  });
  const activeCount = tontine.memberships.filter((m) => m.status === "active").length;
  const currentRound = tontine.rounds.find((r) => r.status === "open" || r.status === "complete" || r.status === "payout_pending");
  return { tontine, activeCount, currentRound };
}

export async function createInvitation(tontineId: string, userId: string, phone?: string) {
  await requirePresident(tontineId, userId);
  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId }, include: { memberships: true } });
  if (tontine.status !== "draft") throw Errors.cycleAlreadyStarted();
  const activeCount = tontine.memberships.filter((m) => m.status === "active" || m.status === "invited").length;
  if (activeCount >= tontine.maxMembers) throw Errors.tontineFull();

  const invitation = await prisma.invitation.create({
    data: {
      tontineId,
      token: randomUUID(),
      phone,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return invitation;
}

export async function previewInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { tontine: { include: { memberships: { where: { status: "active" } } } } },
  });
  if (!invitation) throw Errors.notFound("Invitation");
  if (invitation.usedAt) throw Errors.invitationUsed();
  if (invitation.expiresAt.getTime() < Date.now()) throw Errors.invitationExpired();
  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await previewInvitation(token);
  const tontine = invitation.tontine;
  if (tontine.status !== "draft") throw Errors.cycleAlreadyStarted();

  const existing = await prisma.membership.findUnique({ where: { tontineId_userId: { tontineId: tontine.id, userId } } });
  if (existing && existing.status === "active") throw Errors.alreadyMember();
  if (tontine.memberships.length >= tontine.maxMembers) throw Errors.tontineFull();

  const membership = existing
    ? await prisma.membership.update({
        where: { id: existing.id },
        data: { status: "active", joinedAt: new Date(), acceptedRulesAt: new Date() },
      })
    : await prisma.membership.create({
        data: { tontineId: tontine.id, userId, role: "member", status: "active", joinedAt: new Date(), acceptedRulesAt: new Date() },
      });

  await prisma.invitation.update({ where: { id: invitation.id }, data: { usedAt: new Date() } });

  const president = await prisma.membership.findFirst({ where: { tontineId: tontine.id, role: "president" } });
  if (president) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await notify(president.userId, "new_member", "Nouveau membre", `${user.fullName || user.phone} a rejoint « ${tontine.name} ».`);
  }
  await recordAudit(tontine.id, userId, "member_joined", {});
  return { tontine, membership };
}

/** Tirage au sort vérifiable (ordre aléatoire) ou ordre manuel fourni par le président — cf. écran E15. */
export async function setRotationOrder(tontineId: string, userId: string, mode: "lottery" | "manual", order?: string[]) {
  await requirePresident(tontineId, userId);
  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId } });
  if (tontine.status !== "draft") throw Errors.cycleAlreadyStarted();

  const members = await prisma.membership.findMany({ where: { tontineId, status: "active" } });
  if (members.length < 3) throw Errors.notEnoughMembers();

  let orderedIds: string[];
  if (mode === "lottery") {
    const pool = [...members.map((m) => m.id)];
    orderedIds = [];
    while (pool.length) {
      const idx = randomInt(pool.length);
      orderedIds.push(pool.splice(idx, 1)[0]);
    }
  } else {
    if (!order || order.length !== members.length || !members.every((m) => order!.includes(m.id))) {
      throw Errors.validation("L'ordre fourni doit contenir exactement tous les membres actifs.");
    }
    orderedIds = order;
  }

  await prisma.$transaction(
    orderedIds.map((id, idx) => prisma.membership.update({ where: { id }, data: { rotationPosition: idx + 1 } })),
  );
  await recordAudit(tontineId, userId, "rotation_order_set", { mode });
  return prisma.membership.findMany({ where: { tontineId, status: "active" }, orderBy: { rotationPosition: "asc" }, include: { user: true } });
}

export async function startCycle(tontineId: string, userId: string) {
  await requirePresident(tontineId, userId);
  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId } });
  if (tontine.status !== "draft") throw Errors.cycleAlreadyStarted();

  const members = await prisma.membership.findMany({ where: { tontineId, status: "active" } });
  if (members.length < 3) throw Errors.notEnoughMembers();
  if (members.some((m) => !m.rotationPosition)) {
    throw Errors.validation("L'ordre des tours doit être défini avant de lancer le cycle.");
  }

  await launchCycle(tontineId);
  return getTontineDetail(tontineId, userId);
}
