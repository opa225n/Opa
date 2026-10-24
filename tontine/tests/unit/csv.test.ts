import { describe, it, expect } from "vitest";
import {
  toCsv,
  extractMembersFromCsv,
  extractMembersFromRows,
  looksLikePhone,
  groupMembersByBras,
  extractBrasBase,
} from "@/lib/csv";

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

  it("sans en-tête reconnu, ignore une colonne de pure numérotation au profit de la colonne des noms", () => {
    // Reproduit le bug réel : une colonne "N°" (1, 2, 3...) remplie à 100% ne doit pas être prise
    // pour la colonne des noms si une colonne de texte existe par ailleurs.
    const rows = [
      ["1", "Aïcha Koné"],
      ["2", "Boubacar Diabaté"],
      ["3", "Chantal Yao"],
    ];
    expect(extractMembersFromRows(rows)).toEqual([
      { fullName: "Aïcha Koné", contactPhone: undefined },
      { fullName: "Boubacar Diabaté", contactPhone: undefined },
      { fullName: "Chantal Yao", contactPhone: undefined },
    ]);
  });

  it("trouve le vrai en-tête sous une ligne d'en-tête générique auto-générée par Excel (tableau Excel sans noms de colonnes)", () => {
    // Reproduit un fichier réel : un tableau Excel (ListObject) sans en-têtes personnalisés donne
    // "Colonne1", "Colonne2"... en première ligne, et les vrais libellés apparaissent juste en
    // dessous.
    const rows = [
      ["Colonne1", "Colonne2", "Colonne3"],
      ["0", "NOMS /SURNOMS", "AFFIRMATION"],
      ["1", "ALI BWM", ""],
      ["2", "AMARA", ""],
      ["3", "AROUNA 1", ""],
    ];
    expect(extractMembersFromRows(rows)).toEqual([
      { fullName: "ALI BWM", contactPhone: undefined },
      { fullName: "AMARA", contactPhone: undefined },
      { fullName: "AROUNA 1", contactPhone: undefined },
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

describe("extractBrasBase", () => {
  it("retire un numéro final avec ou sans séparateur", () => {
    expect(extractBrasBase("AROUNA 1")).toBe("AROUNA");
    expect(extractBrasBase("YACOU bache2")).toBe("YACOU bache");
    expect(extractBrasBase("DIAKITE . 1")).toBe("DIAKITE");
    expect(extractBrasBase("DIAKITE .3")).toBe("DIAKITE");
  });

  it("laisse un nom sans numéro final inchangé", () => {
    expect(extractBrasBase("DAKIN-KAYE")).toBe("DAKIN-KAYE");
    expect(extractBrasBase("ETO'O")).toBe("ETO'O");
  });
});

describe("groupMembersByBras", () => {
  it("regroupe les lignes 'Nom N' en un seul membre avec le bon nombre de bras", () => {
    const rows = [
      { fullName: "AROUNA 1" },
      { fullName: "AROUNA 2" },
      { fullName: "AROUNA 3" },
      { fullName: "BAMORY 1" },
      { fullName: "BAMORY 2" },
      { fullName: "ALI BWM" },
    ];
    expect(groupMembersByBras(rows)).toEqual([
      { fullName: "AROUNA", bras: 3, contactPhone: undefined },
      { fullName: "BAMORY", bras: 2, contactPhone: undefined },
      { fullName: "ALI BWM", bras: 1, contactPhone: undefined },
    ]);
  });

  it("regroupe aussi un même nom répété sans numéro", () => {
    const rows = [{ fullName: "DAKIN-KAYE" }, { fullName: "DAKIN-KAYE" }];
    expect(groupMembersByBras(rows)).toEqual([{ fullName: "DAKIN-KAYE", bras: 2, contactPhone: undefined }]);
  });

  it("conserve le premier téléphone non vide du groupe", () => {
    const rows = [
      { fullName: "AROUNA 1", contactPhone: undefined },
      { fullName: "AROUNA 2", contactPhone: "0700000090" },
    ];
    expect(groupMembersByBras(rows)).toEqual([{ fullName: "AROUNA", bras: 2, contactPhone: "0700000090" }]);
  });
});
