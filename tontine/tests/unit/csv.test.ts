import { describe, it, expect } from "vitest";
import { toCsv, extractMembersFromCsv, extractMembersFromRows, looksLikePhone } from "@/lib/csv";

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

describe("extractMembersFromCsv", () => {
  it("détecte les colonnes d'en-tête 'Nom' et 'Téléphone'", () => {
    const rows = extractMembersFromCsv("Nom,Téléphone\nAïcha Koné,0700000001\nBoubacar Diabaté,0700000002");
    expect(rows).toEqual([
      { fullName: "Aïcha Koné", contactPhone: "0700000001" },
      { fullName: "Boubacar Diabaté", contactPhone: "0700000002" },
    ]);
  });

  it("prend la première colonne comme nom quand il n'y a pas d'en-tête reconnu, sans téléphone", () => {
    const rows = extractMembersFromCsv("Aïcha Koné\nBoubacar Diabaté");
    expect(rows).toEqual([
      { fullName: "Aïcha Koné", contactPhone: undefined },
      { fullName: "Boubacar Diabaté", contactPhone: undefined },
    ]);
  });

  it("gère le point-virgule et les champs entre guillemets", () => {
    const rows = extractMembersFromCsv('Nom;Ville\n"Koné; Aïcha";Abidjan');
    expect(rows).toEqual([{ fullName: "Koné; Aïcha", contactPhone: undefined }]);
  });

  it("ignore les lignes vides", () => {
    const rows = extractMembersFromCsv("Aïcha Koné\n\nBoubacar Diabaté\n");
    expect(rows.map((r) => r.fullName)).toEqual(["Aïcha Koné", "Boubacar Diabaté"]);
  });

  it("laisse le téléphone absent quand la colonne n'est pas remplie pour une ligne", () => {
    const rows = extractMembersFromCsv("Nom,Téléphone\nAïcha Koné,\nBoubacar Diabaté,0700000002");
    expect(rows[0]).toEqual({ fullName: "Aïcha Koné", contactPhone: undefined });
    expect(rows[1]).toEqual({ fullName: "Boubacar Diabaté", contactPhone: "0700000002" });
  });

  it("normalise les espaces/tirets/points d'un numéro saisi à la main", () => {
    const rows = extractMembersFromCsv("Nom,Téléphone\nAïcha Koné,07 00-00..00  90");
    expect(rows[0].contactPhone).toBe("07 00 00 00 90");
  });

  it("détecte un en-tête composé comme 'NOM/SURNOMS' (pas une égalité exacte avec 'nom')", () => {
    const rows = extractMembersFromCsv("NOM/SURNOMS,SOMMES\nALI ET BLOUSE / 1,50 000 FCFA");
    expect(rows).toEqual([{ fullName: "ALI ET BLOUSE / 1", contactPhone: undefined }]);
  });
});

describe("extractMembersFromRows", () => {
  it("ignore une colonne A vide et une ligne de titre vide avant le vrai en-tête (tableur fait main)", () => {
    // Reproduit la structure réelle observée : ligne 1 entièrement vide, en-têtes en ligne 2
    // avec la colonne A inutilisée (numérotation en colonne B, noms en colonne C).
    const rows = [
      ["", "", "", "", "", "", "", "", "", ""],
      ["", "N°", "NOM/SURNOMS", "1", "2", "3", "SOMMES", "DATE/SIGNATURE1", "DETE/SIGNATURE 2", "DATE/SIGNATURE 3"],
      ["", "1", "ALI ET BLOUSE / 1", "", "", "", "50 000 FCFA", "", "", ""],
      ["", "2", "BAMORY / 2", "", "", "", "100 000 FCFA", "", "", ""],
    ];
    expect(extractMembersFromRows(rows)).toEqual([
      { fullName: "ALI ET BLOUSE / 1", contactPhone: undefined },
      { fullName: "BAMORY / 2", contactPhone: undefined },
    ]);
  });

  it("sans en-tête reconnu, retombe sur la première colonne majoritairement remplie plutôt que la colonne A", () => {
    const rows = [
      ["", "Aïcha Koné"],
      ["", "Boubacar Diabaté"],
    ];
    expect(extractMembersFromRows(rows)).toEqual([
      { fullName: "Aïcha Koné", contactPhone: undefined },
      { fullName: "Boubacar Diabaté", contactPhone: undefined },
    ]);
  });
});

describe("looksLikePhone", () => {
  it("accepte un numéro ivoirien classique, avec ou sans indicatif", () => {
    expect(looksLikePhone("0700000090")).toBe(true);
    expect(looksLikePhone("+225 07 00 00 00 90")).toBe(true);
  });

  it("rejette un texte qui n'est manifestement pas un numéro", () => {
    expect(looksLikePhone("Abidjan")).toBe(false);
    expect(looksLikePhone("12")).toBe(false);
  });
});
