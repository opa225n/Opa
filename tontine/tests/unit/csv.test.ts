import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("échappe les valeurs contenant un point-virgule ou un guillemet", () => {
    const csv = toCsv(["Nom"], [["Kouadio; Yao"], ['Dit "Le Président"']]);
    expect(csv).toContain('"Kouadio; Yao"');
    expect(csv).toContain('"Dit ""Le Président"""');
  });

  it("préfixe un BOM UTF-8 pour une ouverture correcte dans Excel", () => {
    const csv = toCsv(["A"], [["1"]]);
    expect(csv.startsWith("﻿")).toBe(true);
  });
});
