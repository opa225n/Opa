import "server-only";
import { randomInt, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Invalide les codes précédents non utilisés et en émet un nouveau pour cet utilisateur. */
export async function createVerificationCode(userId: string): Promise<{ code: string }> {
  const code = generateCode();

  await prisma.$transaction([
    prisma.phoneVerificationCode.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.phoneVerificationCode.create({
      data: {
        userId,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);

  return { code };
}

export type VerifyPhoneCodeResult = { ok: true } | { ok: false; error: string };

/** Valide le code le plus récent de l'utilisateur et marque son téléphone comme vérifié. */
export async function verifyPhoneCode(userId: string, rawCode: string): Promise<VerifyPhoneCodeResult> {
  const current = await prisma.phoneVerificationCode.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!current || current.expiresAt < new Date()) {
    return { ok: false, error: "Code expiré ou introuvable. Demandez-en un nouveau." };
  }

  if (current.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Trop de tentatives. Demandez un nouveau code." };
  }

  if (current.codeHash !== hashCode(rawCode)) {
    await prisma.phoneVerificationCode.update({
      where: { id: current.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Code incorrect." };
  }

  await prisma.$transaction([
    prisma.phoneVerificationCode.update({ where: { id: current.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } }),
  ]);

  return { ok: true };
}
