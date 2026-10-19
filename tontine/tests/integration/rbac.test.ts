import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Import après le mock pour que rbac.ts utilise la version mockée de auth().
const { requireMembership, ForbiddenError, UnauthenticatedError } = await import("@/lib/rbac");

describe("requireMembership (contrôle des rôles et des accès)", () => {
  let memberUserId: string;
  let outsiderUserId: string;
  let tontineId: string;

  beforeAll(async () => {
    const member = await prisma.user.create({
      data: {
        phone: "+225070003001",
        fullName: "[TEST] Trésorier",
        passwordHash: await bcrypt.hash("password1234", 4),
        countryCode: "CI",
      },
    });
    const outsider = await prisma.user.create({
      data: {
        phone: "+225070003002",
        fullName: "[TEST] Non-membre",
        passwordHash: await bcrypt.hash("password1234", 4),
        countryCode: "CI",
      },
    });
    memberUserId = member.id;
    outsiderUserId = outsider.id;

    const tontine = await prisma.tontine.create({
      data: {
        name: "[TEST] Tontine RBAC",
        type: "ROTATIVE",
        status: "ACTIVE",
        contributionAmountXof: 5000,
        frequency: "MONTHLY",
        startDate: new Date(),
        createdById: memberUserId,
      },
    });
    tontineId = tontine.id;

    await prisma.tontineMembership.create({
      data: { tontineId, userId: memberUserId, role: "TRESORIER", status: "ACTIVE" },
    });
  });

  afterAll(async () => {
    await prisma.tontine.delete({ where: { id: tontineId } }).catch(() => {});
    await prisma.user.delete({ where: { id: memberUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: outsiderUserId } }).catch(() => {});
  });

  it("lève UnauthenticatedError si personne n'est connecté", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(requireMembership(tontineId)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("lève ForbiddenError pour un utilisateur qui n'est pas membre de la tontine", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: outsiderUserId } });
    await expect(requireMembership(tontineId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("autorise un membre actif sans contrainte de rôle", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: memberUserId } });
    const { membership } = await requireMembership(tontineId);
    expect(membership.role).toBe("TRESORIER");
  });

  it("lève ForbiddenError si le rôle du membre n'est pas dans la liste autorisée", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: memberUserId } });
    await expect(requireMembership(tontineId, ["RESPONSABLE"])).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("autorise si le rôle du membre fait partie de la liste autorisée", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: memberUserId } });
    const { membership } = await requireMembership(tontineId, ["TRESORIER", "RESPONSABLE"]);
    expect(membership.role).toBe("TRESORIER");
  });
});
