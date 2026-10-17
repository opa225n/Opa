import { prisma } from "../../common/prisma";
import { frequencyToDays } from "../../common/membership";
import { notify, notifyMany } from "../notifications/notifications.service";
import { recordAudit } from "../audit/audit.service";
import { requestPayout } from "../payments/payments.service";

/**
 * Calcule le montant du pot : cotisation × nb membres actifs, moins les frais de solidarité
 * (cf. PRD §règles de distribution : "Montant du pot = cotisation × nb membres − frais éventuels").
 */
export function computePotAmount(contributionAmount: bigint, activeMemberCount: number, solidarityFeePct: number): bigint {
  const gross = contributionAmount * BigInt(activeMemberCount);
  if (!solidarityFeePct) return gross;
  const fee = (gross * BigInt(Math.round(solidarityFeePct * 100))) / 10000n;
  return gross - fee;
}

/**
 * Fige l'ordre des tours, crée l'intégralité du calendrier (un Round par membre actif) et ouvre le premier tour.
 * Les règles ne sont plus modifiables après cet appel (cf. PRD règle n°5).
 */
export async function launchCycle(tontineId: string) {
  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId } });
  const activeMembers = await prisma.membership.findMany({
    where: { tontineId, status: "active" },
    orderBy: { rotationPosition: "asc" },
  });

  const potAmount = computePotAmount(tontine.contributionAmount, activeMembers.length, tontine.solidarityFeePct);
  const startDate = tontine.startDate;
  const stepDays = frequencyToDays(tontine.frequency);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < activeMembers.length; i++) {
      const roundNumber = i + 1;
      const dueDate = new Date(startDate.getTime() + i * stepDays * 24 * 60 * 60 * 1000);
      await tx.round.create({
        data: {
          tontineId,
          roundNumber,
          beneficiaryMembershipId: activeMembers[i].id,
          dueDate,
          potAmount,
          status: "planned",
        },
      });
    }
    await tx.tontine.update({ where: { id: tontineId }, data: { status: "active", startedAt: new Date() } });
  });

  await recordAudit(tontineId, null, "cycle_started", { members: activeMembers.length, potAmount: potAmount.toString() });
  await notifyMany(
    activeMembers.map((m) => m.userId),
    "cycle_started",
    "Le cycle a démarré",
    `La tontine « ${tontine.name} » a démarré avec ${activeMembers.length} membres. Pot par tour : ${potAmount} FCFA.`,
  );

  await openNextPlannedRound(tontineId);
}

/** Ouvre le prochain tour "planned" (le plus ancien) : crée les cotisations dues pour tous les membres actifs. */
export async function openNextPlannedRound(tontineId: string) {
  const round = await prisma.round.findFirst({
    where: { tontineId, status: "planned" },
    orderBy: { roundNumber: "asc" },
  });
  if (!round) return null;

  const tontine = await prisma.tontine.findUniqueOrThrow({ where: { id: tontineId } });
  const activeMembers = await prisma.membership.findMany({ where: { tontineId, status: "active" } });

  await prisma.$transaction(async (tx) => {
    await tx.round.update({ where: { id: round.id }, data: { status: "open", openedAt: new Date() } });
    for (const member of activeMembers) {
      await tx.contribution.create({
        data: { roundId: round.id, membershipId: member.id, amountDue: tontine.contributionAmount },
      });
    }
  });

  await notifyMany(
    activeMembers.map((m) => m.userId),
    "round_open",
    `Tour ${round.roundNumber} ouvert`,
    `Cotisez avant le ${round.dueDate.toLocaleDateString("fr-FR")}. Montant : ${tontine.contributionAmount} FCFA.`,
    { tontineId, roundId: round.id },
  );

  return round;
}

/**
 * Vérifie si un tour est entièrement couvert (payé ou dispensé) ; si oui, le clôture et lance le versement.
 * Appelé après chaque confirmation de paiement et après toute décision présidentielle sur un retard.
 */
export async function checkRoundCompletion(roundId: string) {
  const contributions = await prisma.contribution.findMany({ where: { roundId } });
  const allSettled = contributions.every((c) => c.status === "paid" || c.status === "waived");
  if (!allSettled || contributions.length === 0) return;

  const round = await prisma.round.findUniqueOrThrow({ where: { id: roundId } });
  if (round.status === "complete" || round.status === "payout_pending" || round.status === "paid_out") return;

  await prisma.round.update({ where: { id: roundId }, data: { status: "complete", closedAt: new Date() } });
  await recordAudit(round.tontineId, null, "round_completed", { roundId });

  await requestPayout(roundId);
}

/** Clôture un tour alors que des membres sont encore en retard (décision du président, cf. parcours P5). */
export async function closeRoundWithAbsentees(roundId: string, actorId: string) {
  const round = await prisma.round.findUniqueOrThrow({ where: { id: roundId } });
  await prisma.round.update({ where: { id: roundId }, data: { status: "closed", closedAt: new Date() } });
  await recordAudit(round.tontineId, actorId, "round_closed_with_absentees", { roundId });
  await requestPayout(roundId);
}

/** À appeler quand un versement est confirmé : archive le tour et ouvre le suivant, ou termine le cycle. */
export async function onPayoutConfirmed(roundId: string) {
  const round = await prisma.round.update({ where: { id: roundId }, data: { status: "paid_out" } });
  const nextRound = await openNextPlannedRound(round.tontineId);
  if (!nextRound) {
    await prisma.tontine.update({ where: { id: round.tontineId }, data: { status: "completed" } });
    const members = await prisma.membership.findMany({ where: { tontineId: round.tontineId, status: "active" } });
    await notifyMany(
      members.map((m) => m.userId),
      "cycle_completed",
      "Cycle terminé",
      "Tous les membres ont reçu leur tour. La tontine est maintenant terminée. Bravo !",
      { tontineId: round.tontineId },
    );
  }
}

export async function onPayoutFailed(roundId: string) {
  const round = await prisma.round.findUniqueOrThrow({ where: { id: roundId }, include: { beneficiary: true } });
  await notify(
    round.beneficiary.userId,
    "payout_failed",
    "Versement en attente",
    "Le versement de votre pot n'a pas pu être confirmé, l'équipe a été alertée.",
    { roundId },
  );
}
