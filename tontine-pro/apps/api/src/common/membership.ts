import { prisma } from "./prisma";
import { Errors } from "./errors";

export async function requireMembership(tontineId: string, userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { tontineId, userId, status: { in: ["active", "left", "removed"] } },
  });
  if (!membership || membership.status !== "active") throw Errors.notAMember();
  return membership;
}

export async function requirePresident(tontineId: string, userId: string) {
  const membership = await requireMembership(tontineId, userId);
  if (membership.role !== "president") throw Errors.notPresident();
  return membership;
}

export async function requireTreasurerOrPresident(tontineId: string, userId: string) {
  const membership = await requireMembership(tontineId, userId);
  if (membership.role !== "president" && membership.role !== "treasurer") {
    throw Errors.notTreasurerOrPresident();
  }
  return membership;
}

export function frequencyToDays(frequency: string): number {
  switch (frequency) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    default:
      return 7;
  }
}

/** Masque un numéro pour tout le monde sauf son titulaire et l'administrateur (cf. UI/UX §accessibilité). */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return `${phone.slice(0, phone.length - 6)}**${phone.slice(-2)}`;
}
