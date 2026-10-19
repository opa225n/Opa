import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, ForbiddenError } from "@/lib/rbac";
import type { TontineMemberRole } from "@prisma/client";

/**
 * Charge la tontine + la TontineMembership de l'utilisateur courant, après vérification
 * d'autorisation. Si l'utilisateur n'est pas membre actif (isolation stricte entre tontines),
 * renvoie une 404 plutôt qu'une erreur serveur, pour ne pas confirmer l'existence de la tontine
 * à un utilisateur non autorisé.
 */
export async function getTontineContext(tontineId: string, allowedRoles?: TontineMemberRole[]) {
  try {
    const { user, membership } = await requireMembership(tontineId, allowedRoles);
    const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
    if (!tontine) notFound();
    return { user, membership, tontine };
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
}
