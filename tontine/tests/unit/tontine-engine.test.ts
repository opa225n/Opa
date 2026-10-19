import { describe, it, expect } from "vitest";
import { buildRotativeCyclePlan, computeCycleDueDate, generateInvitationCode } from "@/lib/tontine-engine";

describe("computeCycleDueDate", () => {
  const start = new Date("2026-01-05T00:00:00.000Z");

  it("ne décale pas la première période", () => {
    expect(computeCycleDueDate(start, "MONTHLY", 1).toISOString()).toBe(start.toISOString());
  });

  it("ajoute des mois pour une fréquence mensuelle", () => {
    const due = computeCycleDueDate(start, "MONTHLY", 3);
    expect(due.getUTCMonth()).toBe(2); // janvier(0) + 2 mois = mars
  });

  it("ajoute des semaines pour une fréquence hebdomadaire", () => {
    const due = computeCycleDueDate(start, "WEEKLY", 3);
    const diffDays = (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(14);
  });

  it("ajoute des jours pour une fréquence quotidienne", () => {
    const due = computeCycleDueDate(start, "DAILY", 5);
    const diffDays = (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(4);
  });
});

describe("buildRotativeCyclePlan", () => {
  const start = new Date("2026-02-01T00:00:00.000Z");
  const members = ["m1", "m2", "m3"];

  it("crée un tour par membre, dans l'ordre fourni", () => {
    const plan = buildRotativeCyclePlan(start, "MONTHLY", members);
    expect(plan).toHaveLength(3);
    expect(plan.map((p) => p.beneficiaryMembershipId)).toEqual(members);
    expect(plan.map((p) => p.periodIndex)).toEqual([1, 2, 3]);
  });

  it("la date de démarrage du premier tour est la date de démarrage de la tontine", () => {
    const plan = buildRotativeCyclePlan(start, "WEEKLY", members);
    expect(plan[0].periodStart.toISOString()).toBe(start.toISOString());
  });

  it("l'échéance de chaque tour avance d'une période", () => {
    const plan = buildRotativeCyclePlan(start, "WEEKLY", members);
    const diff1 = (plan[1].periodDue.getTime() - plan[0].periodDue.getTime()) / (1000 * 60 * 60 * 24);
    const diff2 = (plan[2].periodDue.getTime() - plan[1].periodDue.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff1).toBe(7);
    expect(diff2).toBe(7);
  });
});

describe("generateInvitationCode", () => {
  it("génère un code de 10 caractères sans caractères ambigus", () => {
    const code = generateInvitationCode();
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("génère des codes différents à chaque appel (haute probabilité)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInvitationCode()));
    expect(codes.size).toBe(20);
  });
});
