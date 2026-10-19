import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, redeemPasswordResetToken } from "@/lib/password-reset";

describe("Réinitialisation de mot de passe (jeton à usage unique)", () => {
  const runId = Math.random().toString(36).slice(2, 10);
  const phoneWithEmail = `+22507000${runId.slice(0, 4)}`;
  const phoneWithoutEmail = `+22507001${runId.slice(0, 4)}`;

  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        phone: phoneWithEmail,
        email: `reset-${runId}@example.test`,
        fullName: "[TEST] Réinitialisation",
        passwordHash: await bcrypt.hash("AncienMotDePasse1", 4),
        countryCode: "CI",
      },
    });
    userId = user.id;

    await prisma.user.create({
      data: {
        phone: phoneWithoutEmail,
        fullName: "[TEST] Sans email",
        passwordHash: await bcrypt.hash("AncienMotDePasse1", 4),
        countryCode: "CI",
      },
    });
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user
      .deleteMany({ where: { phone: { in: [phoneWithEmail, phoneWithoutEmail] } } })
      .catch(() => {});
  });

  it("ne crée aucun jeton pour un compte sans email (canal d'envoi indisponible)", async () => {
    const result = await createPasswordResetToken(phoneWithoutEmail);
    expect(result).toBeNull();
  });

  it("ne crée aucun jeton pour un numéro inconnu", async () => {
    const result = await createPasswordResetToken("+225000000000");
    expect(result).toBeNull();
  });

  it("crée un jeton, met à jour le mot de passe une fois utilisé, puis le rejette au second usage", async () => {
    const created = await createPasswordResetToken(phoneWithEmail);
    expect(created).not.toBeNull();

    const first = await redeemPasswordResetToken(created!.rawToken, "NouveauMotDePasse1");
    expect(first).toEqual({ ok: true });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare("NouveauMotDePasse1", user.passwordHash)).toBe(true);

    const second = await redeemPasswordResetToken(created!.rawToken, "AutreMotDePasse1");
    expect(second.ok).toBe(false);
  });

  it("rejette un jeton inconnu", async () => {
    const result = await redeemPasswordResetToken("jeton-inexistant", "NouveauMotDePasse1");
    expect(result.ok).toBe(false);
  });

  it("rejette un jeton expiré", async () => {
    const created = await createPasswordResetToken(phoneWithEmail);
    expect(created).not.toBeNull();

    await prisma.passwordResetToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await redeemPasswordResetToken(created!.rawToken, "NouveauMotDePasse2");
    expect(result.ok).toBe(false);
  });
});
