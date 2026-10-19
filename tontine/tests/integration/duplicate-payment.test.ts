import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Reproduit la vérification anti-doublon utilisée par recordPaymentAction : une référence
 * de transaction déjà utilisée (et non annulée) sur la même tontine doit être détectée.
 */
describe("Détection des paiements en double (référence de transaction)", () => {
  let userId: string;
  let tontineId: string;
  let contributionId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        phone: "+225070002001",
        fullName: "[TEST] Membre doublons",
        passwordHash: await bcrypt.hash("password1234", 4),
        countryCode: "CI",
      },
    });
    userId = user.id;

    const tontine = await prisma.tontine.create({
      data: {
        name: "[TEST] Tontine doublons",
        type: "ROTATIVE",
        status: "ACTIVE",
        contributionAmountXof: 10000,
        frequency: "MONTHLY",
        startDate: new Date(),
        createdById: userId,
      },
    });
    tontineId = tontine.id;

    const membership = await prisma.tontineMembership.create({
      data: { tontineId, userId, role: "MEMBRE", status: "ACTIVE" },
    });
    const cycle = await prisma.tontineCycle.create({
      data: { tontineId, periodIndex: 1, periodStart: new Date(), periodDue: new Date(), status: "ACTIVE" },
    });
    const contribution = await prisma.contribution.create({
      data: { tontineId, cycleId: cycle.id, membershipId: membership.id, amountExpectedXof: 10000, status: "DUE" },
    });
    contributionId = contribution.id;

    await prisma.payment.create({
      data: {
        contributionId,
        amountXof: 10000,
        method: "MOBILE_MONEY",
        status: "DECLARED",
        paidAt: new Date(),
        transactionRef: "MM-REF-123",
        recordedById: userId,
      },
    });
  });

  afterAll(async () => {
    await prisma.tontine.delete({ where: { id: tontineId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  async function isDuplicate(transactionRef: string) {
    const duplicate = await prisma.payment.findFirst({
      where: {
        transactionRef,
        contribution: { tontineId },
        status: { not: "CANCELLED" },
      },
    });
    return duplicate !== null;
  }

  it("détecte une référence déjà utilisée", async () => {
    expect(await isDuplicate("MM-REF-123")).toBe(true);
  });

  it("n'alerte pas pour une référence inconnue", async () => {
    expect(await isDuplicate("MM-REF-999")).toBe(false);
  });

  it("n'alerte plus si le paiement original a été annulé", async () => {
    await prisma.payment.updateMany({
      where: { contributionId, transactionRef: "MM-REF-123" },
      data: { status: "CANCELLED" },
    });
    expect(await isDuplicate("MM-REF-123")).toBe(false);
  });
});
