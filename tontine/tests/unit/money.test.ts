import { describe, it, expect } from "vitest";
import { formatXof, assertIntegerXof } from "@/lib/money";

describe("formatXof", () => {
  it("formate un montant entier avec séparateurs de milliers et le suffixe FCFA", () => {
    expect(formatXof(100000)).toBe("100 000 FCFA");
  });

  it("arrondit si jamais un flottant est passé par erreur", () => {
    expect(formatXof(999.6)).toBe("1 000 FCFA");
  });
});

describe("assertIntegerXof", () => {
  it("accepte un entier positif", () => {
    expect(() => assertIntegerXof(5000)).not.toThrow();
  });

  it("rejette un montant flottant", () => {
    expect(() => assertIntegerXof(5000.5)).toThrow();
  });

  it("rejette un montant négatif", () => {
    expect(() => assertIntegerXof(-1)).toThrow();
  });
});
