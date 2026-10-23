import { describe, it, expect } from "vitest";
import { toCsv, extractNamesFromCsv } from "@/lib/csv";

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

describe("extractNamesFromCsv", () => {
  it("détecte une colonne d'en-tête 'Nom' et ignore les autres colonnes", () => {
    const names = extractNamesFromCsv("Nom,Téléphone\nAïcha Koné,0700000001\nBoubacar Diabaté,0700000002");
    expect(names).toEqual(["Aïcha Koné", "Boubacar Diabaté"]);
  });

  it("prend la première colonne quand il n'y a pas d'en-tête reconnu", () => {
    const names = extractNamesFromCsv("Aïcha Koné\nBoubacar Diabaté");
    expect(names).toEqual(["Aïcha Koné", "Boubacar Diabaté"]);
  });

  it("gère le point-virgule et les champs entre guillemets", () => {
    const names = extractNamesFromCsv('Nom;Ville\n"Koné; Aïcha";Abidjan');
    expect(names).toEqual(["Koné; Aïcha"]);
  });

  it("ignore les lignes vides", () => {
    const names = extractNamesFromCsv("Aïcha Koné\n\nBoubacar Diabaté\n");
    expect(names).toEqual(["Aïcha Koné", "Boubacar Diabaté"]);
  });
});
