import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { recomputeContribution } from "@/lib/tontine-engine";
import bcrypt from "bcryptjs";

async function createUser(phoneSuffix: string) {
  return prisma.user.create({
    data: {
      phone: `+225070000${phoneSuffix}`,
      fullName: `Test User ${phoneSuffix}`,
      passwordHash: await bcrypt.hash("password1234", 4),
      countryCode: "CI",
    },
  });
}

describe("recomputeContribution", () => {
  let userId: string;
  let tontineId: string;
  let membershipId: string;
  let cycleId: string;
  let contributionId: string;

  beforeAll(async () => {
    const user = await createUser("901");
    userId = user.id;

    const tontine = await prisma.tontine.create({
      data: {
        name: "[TEST] Tontine recompute",
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
    membershipId = membership.id;

    const cycle = await prisma.tontineCycle.create({
      data: { tontineId, periodIndex: 1, periodStart: new Date(), periodDue: new Date(), status: "ACTIVE" },
    });
    cycleId = cycle.id;

    const contribution = await prisma.contribution.create({
      data: { tontineId, cycleId, membershipId, amountExpectedXof: 10000, status: "DUE" },
    });
    contributionId = contribution.id;
  });

  afterAll(async () => {
    await prisma.tontine.delete({ where: { id: tontineId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  it("reste DUE sans paiement confirmé", async () => {
    const result = await recomputeContribution(contributionId);
    expect(result.confirmed).toBe(0);
    expect(result.status).toBe("DUE");
  });

  it("passe à PARTIAL avec un paiement confirmé partiel", async () => {
    await prisma.payment.create({
      data: {
        contributionId,
        amountXof: 4000,
        method: "CASH",
        status: "CONFIRMED",
        paidAt: new Date(),
        recordedById: userId,
      },
    });
    const result = await recomputeContribution(contributionId);
    expect(result.confirmed).toBe(4000);
    expect(result.status).toBe("PARTIAL");
  });

  it("ignore les paiements non confirmés (déclarés, rejetés) dans le calcul", async () => {
    await prisma.payment.create({
      data: {
        contributionId,
        amountXof: 6000,
        method: "CASH",
        status: "DECLARED",
        paidAt: new Date(),
        recordedById: userId,
      },
    });
    await prisma.payment.create({
      data: {
        contributionId,
        amountXof: 999999,
        method: "CASH",
        status: "REJECTED",
        paidAt: new Date(),
        recordedById: userId,
        rejectionReason: "test",
      },
    });
    const result = await recomputeContribution(contributionId);
    expect(result.confirmed).toBe(4000); // inchangé : seul CONFIRMED compte
    expect(result.status).toBe("PARTIAL");
  });

  it("passe à CONFIRMED une fois le montant attendu atteint", async () => {
    await prisma.payment.create({
      data: {
        contributionId,
        amountXof: 6000,
        method: "MOBILE_MONEY",
        status: "CONFIRMED",
        paidAt: new Date(),
        recordedById: userId,
      },
    });
    const result = await recomputeContribution(contributionId);
    expect(result.confirmed).toBe(10000);
    expect(result.status).toBe("CONFIRMED");
  });
});
