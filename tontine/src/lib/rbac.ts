import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TontineMemberRole, MembershipStatus } from "@prisma/client";

export { writeAuditLog } from "@/lib/audit-log";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentification requise.");
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé : vous n'êtes pas autorisé pour cette tontine.") {
    super(message);
  }
}

/**
 * Récupère l'utilisateur connecté (session serveur). Lève si non authentifié.
 * C'est la SEULE source de vérité pour l'identité : on ne fait jamais confiance
 * à un id/role envoyé par le client.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthenticatedError();
  return session.user as { id: string; name?: string | null; phone?: string; platformRole?: string };
}

/**
 * Vérifie que l'utilisateur courant est membre ACTIF de la tontine donnée, et retourne
 * sa TontineMembership. Lève ForbiddenError sinon. Utiliser sur CHAQUE action/route qui
 * touche à une ressource scoppée à une tontine : c'est ce qui garantit l'isolation stricte
 * entre tontines exigée par le cahier des charges.
 */
export async function requireMembership(tontineId: string, allowedRoles?: TontineMemberRole[]) {
  const user = await requireUser();
  const membership = await prisma.tontineMembership.findUnique({
    where: { tontineId_userId: { tontineId, userId: user.id } },
  });

  if (!membership || membership.status !== ("ACTIVE" as MembershipStatus)) {
    throw new ForbiddenError();
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ForbiddenError(
      `Accès refusé : rôle requis parmi [${allowedRoles.join(", ")}], rôle actuel: ${membership.role}.`
    );
  }

  return { user, membership };
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (user.platformRole !== "ADMIN") {
    throw new ForbiddenError("Accès refusé : réservé aux administrateurs de la plateforme.");
  }
  return user;
}
