export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const str = String(value);
    if (/[",\n;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escape).join(";"), ...rows.map((row) => row.map(escape).join(";"))];
  return "﻿" + lines.join("\n"); // BOM pour une ouverture correcte dans Excel (accents FR)
}

/** Parseur CSV minimal (virgule ou point-virgule, champs entre guillemets autorisés). */
export function parseCsv(text: string): string[][] {
  const delimiter = text.indexOf(";") > -1 && text.indexOf(";") < (text.indexOf(",") === -1 ? Infinity : text.indexOf(",")) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim().length > 0)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim().length > 0)) rows.push(row);

  return rows;
}

const NAME_HEADER_CANDIDATES = ["nom", "name", "nom complet", "membre", "full name", "fullname"];
const PHONE_HEADER_CANDIDATES = ["téléphone", "telephone", "tel", "tél", "phone", "numero", "numéro", "contact"];

export interface ImportedMemberRow {
  fullName: string;
  contactPhone?: string;
}

/** Normalise un numéro saisi à la main : espaces/points/tirets multiples réduits à un seul espace. */
function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s.-]+/g, " ");
}

/** Vérifie grossièrement qu'un numéro ressemble à un numéro ivoirien (8 à 13 chiffres, + facultatif). */
export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 13;
}

/**
 * Choisit, à défaut d'en-tête reconnu, la première colonne majoritairement remplie (plutôt que la
 * colonne A systématiquement — fréquemment vide ou réservée à un numéro de ligne dans les tableurs
 * faits à la main).
 */
function pickFallbackColumn(rows: string[][]): number {
  const columnCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
  for (let col = 0; col < columnCount; col++) {
    const filledCount = rows.filter((r) => (r[col] ?? "").length > 0).length;
    if (filledCount >= rows.length / 2) return col;
  }
  return 0;
}

/**
 * Extrait les membres (nom + téléphone facultatif) d'une table déjà découpée en lignes/colonnes
 * (CSV ou feuille Excel) : détecte les en-têtes contenant "nom" / "téléphone" (ex: "NOM/SURNOMS",
 * "N° TÉLÉPHONE") si présents ; sans en-tête reconnu, le nom retombe sur la première colonne
 * majoritairement remplie et le téléphone reste absent (trop ambigu à deviner par position).
 */
export function extractMembersFromRows(rawRows: string[][]): ImportedMemberRow[] {
  const rows = rawRows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f.length > 0));
  if (rows.length === 0) return [];

  const firstRow = rows[0].map((f) => f.toLowerCase());
  const nameHeaderIndex = firstRow.findIndex((f) => NAME_HEADER_CANDIDATES.some((c) => f.includes(c)));
  const phoneHeaderIndex = firstRow.findIndex((f) => PHONE_HEADER_CANDIDATES.some((c) => f.includes(c)));
  const hasHeader = nameHeaderIndex !== -1 || phoneHeaderIndex !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const nameColumn = nameHeaderIndex !== -1 ? nameHeaderIndex : pickFallbackColumn(dataRows);

  return dataRows
    .map((r) => {
      const rawPhone = phoneHeaderIndex !== -1 ? r[phoneHeaderIndex] : undefined;
      return {
        fullName: r[nameColumn] ?? "",
        contactPhone: rawPhone ? normalizePhone(rawPhone) : undefined,
      };
    })
    .filter((m) => m.fullName.length > 0);
}

/** Extrait les membres d'un texte CSV (voir {@link extractMembersFromRows}). */
export function extractMembersFromCsv(text: string): ImportedMemberRow[] {
  return extractMembersFromRows(parseCsv(text));
}
