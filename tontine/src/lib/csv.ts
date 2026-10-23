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

/** Extrait une colonne "nom" d'une table CSV : détecte l'en-tête si présent, sinon prend la 1re colonne. */
export function extractNamesFromCsv(text: string): string[] {
  const rows = parseCsv(text).map((r) => r.map((f) => f.trim()));
  if (rows.length === 0) return [];

  const firstRow = rows[0].map((f) => f.toLowerCase());
  const headerIndex = firstRow.findIndex((f) => NAME_HEADER_CANDIDATES.includes(f));
  const hasHeader = headerIndex !== -1;
  const nameColumn = hasHeader ? headerIndex : 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((r) => r[nameColumn] ?? "").filter((n) => n.length > 0);
}
