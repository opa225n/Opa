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

/** Vrai si la quasi-totalité des valeurs non vides d'une colonne sont de purs nombres (ex: une numérotation de ligne). */
function isMostlyNumericColumn(rows: string[][], col: number): boolean {
  const values = rows.map((r) => r[col] ?? "").filter((v) => v.length > 0);
  if (values.length === 0) return false;
  const numericCount = values.filter((v) => /^\d+([.,]\d+)?$/.test(v)).length;
  return numericCount / values.length >= 0.8;
}

const HEADER_SCAN_ROWS = 5;

/**
 * Cherche une ligne d'en-tête reconnaissable parmi les premières lignes (et non uniquement la
 * toute première) : certains tableurs ont une ligne d'en-tête générique auto-générée par Excel
 * ("Colonne1", "Colonne2"...) suivie d'une vraie ligne de libellés juste en dessous.
 */
function findHeaderRow(rows: string[][]): { rowIndex: number; nameCol: number; phoneCol: number } | null {
  for (let i = 0; i < Math.min(HEADER_SCAN_ROWS, rows.length); i++) {
    const row = rows[i].map((f) => f.toLowerCase());
    const nameCol = row.findIndex((f) => NAME_HEADER_CANDIDATES.some((c) => f.includes(c)));
    const phoneCol = row.findIndex((f) => PHONE_HEADER_CANDIDATES.some((c) => f.includes(c)));
    if (nameCol !== -1 || phoneCol !== -1) return { rowIndex: i, nameCol, phoneCol };
  }
  return null;
}

/**
 * Choisit, à défaut d'en-tête reconnu, la première colonne majoritairement remplie et pas
 * purement numérique (plutôt que la colonne A systématiquement, ou une colonne de simple
 * numérotation de ligne — fréquentes dans les tableurs faits à la main).
 */
function pickFallbackColumn(rows: string[][]): number {
  const columnCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
  for (let col = 0; col < columnCount; col++) {
    const filledCount = rows.filter((r) => (r[col] ?? "").length > 0).length;
    if (filledCount >= rows.length / 2 && !isMostlyNumericColumn(rows, col)) return col;
  }
  return 0;
}

/**
 * Extrait les membres (nom + téléphone facultatif) d'une table déjà découpée en lignes/colonnes
 * (CSV ou feuille Excel) : cherche parmi les premières lignes un en-tête contenant "nom" /
 * "téléphone" (ex: "NOM/SURNOMS", "N° TÉLÉPHONE") — y compris quand il est précédé d'une ligne
 * d'en-tête générique auto-générée par Excel ("Colonne1", "Colonne2"...). Sans en-tête reconnu,
 * le nom retombe sur la première colonne majoritairement remplie et pas purement numérique, et le
 * téléphone reste absent (trop ambigu à deviner par position).
 */
export function extractMembersFromRows(rawRows: string[][]): ImportedMemberRow[] {
  const rows = rawRows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f.length > 0));
  if (rows.length === 0) return [];

  const header = findHeaderRow(rows);
  const dataRows = header ? rows.slice(header.rowIndex + 1) : rows;
  const phoneHeaderIndex = header?.phoneCol ?? -1;
  const nameColumn = header && header.nameCol !== -1 ? header.nameCol : pickFallbackColumn(dataRows);

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

export interface GroupedMemberRow {
  fullName: string;
  bras: number;
  contactPhone?: string;
}

/**
 * Nom de base d'une ligne "Nom N" (un bras d'un même cotisant listé comme une ligne séparée,
 * convention vue dans certains tableurs de tontine) : retire un numéro final, précédé ou non d'un
 * séparateur (espace, point, tiret, combinaison des trois — ex: "AROUNA 1", "DIAKITE . 3",
 * "YACOU bache2"). Un nom sans numéro final est renvoyé tel quel.
 */
export function extractBrasBase(fullName: string): string {
  const trimmed = fullName.trim();
  const match = trimmed.match(/^(.*?)[\s.-]*(\d+)$/);
  if (match && match[1].trim().length > 0) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Regroupe les lignes "Nom 1", "Nom 2"... (ou un même nom répété tel quel) en un seul membre à
 * plusieurs bras : convention observée dans certains tableurs de tontine où chaque bras d'un même
 * cotisant est listé comme une ligne séparée au lieu d'un seul membre avec un compte de bras.
 */
export function groupMembersByBras(rows: ImportedMemberRow[]): GroupedMemberRow[] {
  const order: string[] = [];
  const groups = new Map<string, GroupedMemberRow>();
  for (const row of rows) {
    const base = extractBrasBase(row.fullName);
    const key = base.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.bras += 1;
      if (!existing.contactPhone && row.contactPhone) existing.contactPhone = row.contactPhone;
    } else {
      groups.set(key, { fullName: base, bras: 1, contactPhone: row.contactPhone });
      order.push(key);
    }
  }
  return order.map((key) => groups.get(key)!);
}
