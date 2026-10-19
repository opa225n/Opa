import "server-only";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Crée un jeton de réinitialisation pour le compte associé à ce numéro, si et seulement si le
 * compte existe, n'est pas supprimé/suspendu, et a une adresse e-mail renseignée (seul canal
 * d'envoi disponible). Retourne `null` dans tous les autres cas — l'appelant doit alors répondre
 * par le même message générique que pour un succès, pour ne pas révéler l'existence du compte.
 */
export async function createPasswordResetToken(phone: string): Promise<{ rawToken: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.deletedAt || user.isSuspended || !user.email) {
    return null;
  }

  const rawToken = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { rawToken, email: user.email };
}

export type RedeemPasswordResetTokenResult = { ok: true } | { ok: false; error: string };

/** Valide le jeton (existant, non utilisé, non expiré) et remplace le mot de passe du compte. */
export async function redeemPasswordResetToken(
  rawToken: string,
  newPassword: string
): Promise<RedeemPasswordResetTokenResult> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { ok: false, error: "Ce lien de réinitialisation est invalide ou a expiré." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
