import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createVerificationCode, verifyPhoneCode } from "@/lib/phone-verification";

describe("Vérification du numéro de téléphone (code OTP à usage unique)", () => {
  const runId = Math.random().toString(36).slice(2, 10);
  const phone = `+22507002${runId.slice(0, 4)}`;

  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        phone,
        fullName: "[TEST] Vérification téléphone",
        passwordHash: await bcrypt.hash("MotDePasse1234", 4),
        countryCode: "CI",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.phoneVerificationCode.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
  });

  it("valide le bon code et marque le téléphone comme vérifié", async () => {
    const { code } = await createVerificationCode(userId);

    const result = await verifyPhoneCode(userId, code);
    expect(result).toEqual({ ok: true });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.phoneVerified).toBe(true);
  });

  it("rejette un code déjà utilisé", async () => {
    const { code } = await createVerificationCode(userId);
    await verifyPhoneCode(userId, code);

    const second = await verifyPhoneCode(userId, code);
    expect(second.ok).toBe(false);
  });

  it("rejette un mauvais code et incrémente les tentatives", async () => {
    await createVerificationCode(userId);

    const result = await verifyPhoneCode(userId, "000000");
    expect(result.ok).toBe(false);

    const current = await prisma.phoneVerificationCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(current?.attempts).toBeGreaterThanOrEqual(1);
  });

  it("invalide le code précédent quand un nouveau est demandé", async () => {
    const first = await createVerificationCode(userId);
    await createVerificationCode(userId);

    const result = await verifyPhoneCode(userId, first.code);
    expect(result.ok).toBe(false);
  });

  it("rejette un code expiré", async () => {
    const { code } = await createVerificationCode(userId);
    await prisma.phoneVerificationCode.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await verifyPhoneCode(userId, code);
    expect(result.ok).toBe(false);
  });
});
