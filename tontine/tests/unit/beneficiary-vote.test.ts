import { describe, it, expect } from "vitest";
import { tallyBeneficiaryVotes } from "@/lib/beneficiary-vote";

describe("tallyBeneficiaryVotes", () => {
  it("désigne le candidat avec le plus de voix", () => {
    const winner = tallyBeneficiaryVotes(
      ["m1", "m2", "m3"],
      [
        { candidateMembershipId: "m2" },
        { candidateMembershipId: "m2" },
        { candidateMembershipId: "m1" },
      ]
    );
    expect(winner).toBe("m2");
  });

  it("en cas d'égalité, retient le candidat le plus proche dans la file (premier de la liste)", () => {
    const winner = tallyBeneficiaryVotes(
      ["m1", "m2"],
      [{ candidateMembershipId: "m1" }, { candidateMembershipId: "m2" }]
    );
    expect(winner).toBe("m1");
  });

  it("sans aucun vote, retient le premier candidat de la file (comportement par défaut de l'ordre fixe)", () => {
    const winner = tallyBeneficiaryVotes(["m1", "m2", "m3"], []);
    expect(winner).toBe("m1");
  });

  it("ignore les votes pour un candidat hors du vivier éligible", () => {
    const winner = tallyBeneficiaryVotes(
      ["m1", "m2"],
      [
        { candidateMembershipId: "m-hors-vivier" },
        { candidateMembershipId: "m-hors-vivier" },
        { candidateMembershipId: "m2" },
      ]
    );
    expect(winner).toBe("m2");
  });
});
