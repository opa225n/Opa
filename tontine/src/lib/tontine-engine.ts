import "server-only";
import { randomInt } from "node:crypto";
import { addDays, addMonths, addWeeks } from "date-fns";
import type { Frequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Renvoie la periodIndex-ième date (1-based) à partir de startDate (incluse) dont le jour de la
 * semaine (0=dimanche...6=samedi, convention Date.getDay()) figure dans weekdays. Sert à la
 * fréquence CUSTOM_WEEKLY (ex: tours chaque mardi et samedi — pas un intervalle régulier).
 */
function nthMatchingWeekday(startDate: Date, weekdays: number[], periodIndex: number): Date {
  if (weekdays.length === 0) {
    throw new Error("customWeekdays doit contenir au moins un jour pour la fréquence CUSTOM_WEEKLY.");
  }
  const days = new Set(weekdays);
  let found = 0;
  let cursor = startDate;
  while (true) {
    if (days.has(cursor.getDay())) {
      found++;
      if (found === periodIndex) return cursor;
    }
    cursor = addDays(cursor, 1);
  }
}

/**
 * Calcule la date d'échéance d'une période à partir de la date de démarrage,
 * de la fréquence et de l'index de période (1-based).
 */
export function computeCycleDueDate(
  startDate: Date,
  frequency: Frequency,
  periodIndex: number,
  customWeekdays?: number[]
): Date {
  const offset = periodIndex - 1;
  switch (frequency) {
    case "DAILY":
      return addDays(startDate, offset);
    case "WEEKLY":
      return addWeeks(startDate, offset);
    case "CUSTOM_WEEKLY":
      return nthMatchingWeekday(startDate, customWeekdays ?? [], periodIndex);
    case "MONTHLY":
    default:
      return addMonths(startDate, offset);
  }
}

export interface CyclePlanItem {
  periodIndex: number;
  periodStart: Date;
  periodDue: Date;
  beneficiaryMembershipId: string;
}

/**
 * Construit le plan des tours pour une tontine rotative classique : un tour par membre actif,
 * dans l'ordre fourni (déjà validé/confirmé côté appelant). Un seul tour complet par défaut
 * (limite connue du MVP, documentée dans le README : pas de reconduction automatique).
 */
export function buildRotativeCyclePlan(
  startDate: Date,
  frequency: Frequency,
  orderedMembershipIds: string[],
  customWeekdays?: number[]
): CyclePlanItem[] {
  return orderedMembershipIds.map((membershipId, index) => {
    const periodIndex = index + 1;
    const periodDue = computeCycleDueDate(startDate, frequency, periodIndex, customWeekdays);
    const periodStart =
      index === 0 ? startDate : computeCycleDueDate(startDate, frequency, periodIndex - 1, customWeekdays);
    return { periodIndex, periodStart, periodDue, beneficiaryMembershipId: membershipId };
  });
}

export type RecomputedContributionStatus = "DUE" | "PARTIAL" | "CONFIRMED";

/**
 * Recalcule le montant confirmé et le statut d'une cotisation à partir de la somme des
 * paiements CONFIRMED qui lui sont liés. Seule source de vérité pour ce calcul : ne jamais
 * dériver le statut autrement (ex: depuis une valeur envoyée par le client).
 */
export async function recomputeContribution(contributionId: string) {
  const payments = await prisma.payment.findMany({
    where: { contributionId, status: "CONFIRMED" },
    select: { amountXof: true },
  });
  const confirmed = payments.reduce((sum, p) => sum + p.amountXof, 0);
  const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });

  // Le total dû inclut l'éventuelle pénalité de retard déjà appliquée (cf. applyLatePenaltiesAction) :
  // un membre en retard doit régler cotisation + pénalité pour que sa cotisation soit confirmée.
  const totalDue = contribution.amountExpectedXof + contribution.penaltyXof;
  let status: RecomputedContributionStatus = "DUE";
  if (confirmed >= totalDue && confirmed > 0) status = "CONFIRMED";
  else if (confirmed > 0) status = "PARTIAL";

  await prisma.contribution.update({
    where: { id: contributionId },
    data: { amountConfirmedXof: confirmed, status },
  });

  return { confirmed, status };
}

export function generateInvitationCode(): string {
  // Code court, lisible, à entropie cryptographique (node:crypto), pour un lien
  // d'invitation à durée limitée (cf. Invitation.expiresAt).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}
