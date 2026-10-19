import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Vérifie l'exigence centrale de sécurité : un utilisateur membre d'une tontine ne doit
 * jamais pouvoir accéder aux données d'une tontine dont il n'est pas membre, même en
 * connaissant son id (pas d'IDOR). On teste ici la couche la plus basse : une requête
 * correctement scoppée par membershipId/tontineId ne doit renvoyer aucune ligne d'une
 * autre tontine.
 */
describe("Isolation stricte entre tontines", () => {
  let userAId: string;
  let userBId: string;
  let tontineAId: string;
  let tontineBId: string;
  let membershipAId: string;
  let contributionAId: string;
  let contributionBId: string;

  beforeAll(async () => {
    const userA = await prisma.user.create({
      data: {
        phone: "+225070001001",
        fullName: "[TEST] Membre Tontine A",
        passwordHash: await bcrypt.hash("password1234", 4),
        countryCode: "CI",
      },
    });
    const userB = await prisma.user.create({
      data: {
        phone: "+225070001002",
        fullName: "[TEST] Membre Tontine B",
        passwordHash: await bcrypt.hash("password1234", 4),
        countryCode: "CI",
      },
    });
    userAId = userA.id;
    userBId = userB.id;

    const tontineA = await prisma.tontine.create({
      data: {
        name: "[TEST] Tontine A",
        type: "ROTATIVE",
        status: "ACTIVE",
        contributionAmountXof: 5000,
        frequency: "WEEKLY",
        startDate: new Date(),
        createdById: userAId,
      },
    });
    const tontineB = await prisma.tontine.create({
      data: {
        name: "[TEST] Tontine B",
        type: "ROTATIVE",
        status: "ACTIVE",
        contributionAmountXof: 7000,
        frequency: "WEEKLY",
        startDate: new Date(),
        createdById: userBId,
      },
    });
    tontineAId = tontineA.id;
    tontineBId = tontineB.id;

    const membershipA = await prisma.tontineMembership.create({
      data: { tontineId: tontineAId, userId: userAId, role: "RESPONSABLE", status: "ACTIVE" },
    });
    const membershipB = await prisma.tontineMembership.create({
      data: { tontineId: tontineBId, userId: userBId, role: "RESPONSABLE", status: "ACTIVE" },
    });
    membershipAId = membershipA.id;

    const cycleA = await prisma.tontineCycle.create({
      data: { tontineId: tontineAId, periodIndex: 1, periodStart: new Date(), periodDue: new Date(), status: "ACTIVE" },
    });
    const cycleB = await prisma.tontineCycle.create({
      data: { tontineId: tontineBId, periodIndex: 1, periodStart: new Date(), periodDue: new Date(), status: "ACTIVE" },
    });

    const contributionA = await prisma.contribution.create({
      data: { tontineId: tontineAId, cycleId: cycleA.id, membershipId: membershipAId, amountExpectedXof: 5000, status: "DUE" },
    });
    const contributionB = await prisma.contribution.create({
      data: { tontineId: tontineBId, cycleId: cycleB.id, membershipId: membershipB.id, amountExpectedXof: 7000, status: "DUE" },
    });
    contributionAId = contributionA.id;
    contributionBId = contributionB.id;
  });

  afterAll(async () => {
    await prisma.tontine.delete({ where: { id: tontineAId } }).catch(() => {});
    await prisma.tontine.delete({ where: { id: tontineBId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
  });

  it("userA n'a pas de TontineMembership sur la tontine B", async () => {
    const membership = await prisma.tontineMembership.findUnique({
      where: { tontineId_userId: { tontineId: tontineBId, userId: userAId } },
    });
    expect(membership).toBeNull();
  });

  it("une requête de cotisations scoppée à la tontine A ne retourne jamais celles de B", async () => {
    const contributions = await prisma.contribution.findMany({ where: { tontineId: tontineAId } });
    expect(contributions.map((c) => c.id)).toEqual([contributionAId]);
    expect(contributions.map((c) => c.id)).not.toContain(contributionBId);
  });

  it("une tentative de confirmer un paiement d'une autre tontine via son id ne doit pas réussir sans vérifier la tontine propriétaire", async () => {
    // Simule la vérification faite par confirmPaymentAction : on dérive toujours le
    // tontineId réel depuis la ressource en base, jamais depuis une valeur fournie par
    // l'appelant, avant de contrôler la TontineMembership.
    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionBId } });
    const membershipOfCaller = await prisma.tontineMembership.findUnique({
      where: { tontineId_userId: { tontineId: contribution.tontineId, userId: userAId } },
    });
    expect(membershipOfCaller).toBeNull(); // userA doit être refusé sur une ressource de la tontine B
  });
});
