"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import readXlsxFile from "read-excel-file/browser";
import { Upload, X, AlertTriangle } from "lucide-react";
import { importManagedMembersAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  extractMembersFromCsv,
  extractMembersFromRows,
  groupMembersByBras,
  looksLikePhone,
  type ImportedMemberRow,
  type GroupedMemberRow,
} from "@/lib/csv";

function normalizeForCompare(name: string) {
  return name.trim().toLowerCase();
}

export function ImportMembersForm({
  tontineId,
  existingNames,
}: {
  tontineId: string;
  existingNames: string[];
}) {
  const router = useRouter();
  const [rawExtracted, setRawExtracted] = useState<ImportedMemberRow[]>([]);
  const [grouped, setGrouped] = useState(true);
  const [removedKeys, setRemovedKeys] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ungroupedAsRows: GroupedMemberRow[] = useMemo(
    () => rawExtracted.map((r) => ({ fullName: r.fullName, contactPhone: r.contactPhone, bras: 1 })),
    [rawExtracted]
  );
  const groupedRows = useMemo(() => groupMembersByBras(rawExtracted), [rawExtracted]);
  const hasGroupableRows = groupedRows.some((r) => r.bras > 1);

  const allRows = grouped ? groupedRows : ungroupedAsRows;
  const rows = allRows.filter((_, i) => !removedKeys.has(i));

  const existingNameSet = useMemo(
    () => new Set(existingNames.map(normalizeForCompare)),
    [existingNames]
  );

  const allWarnings = useMemo(() => {
    const seenInFile = new Set<string>();
    return allRows.map((row, i) => {
      const key = normalizeForCompare(row.fullName);
      const isDuplicate = !removedKeys.has(i) && (existingNameSet.has(key) || seenInFile.has(key));
      if (!removedKeys.has(i)) seenInFile.add(key);
      const hasBadPhone = Boolean(row.contactPhone) && !looksLikePhone(row.contactPhone!);
      return { isDuplicate, hasBadPhone };
    });
  }, [allRows, existingNameSet, removedKeys]);

  const duplicateCount = allWarnings.filter((w, i) => w.isDuplicate && !removedKeys.has(i)).length;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSuccess(null);

    const lowerName = file.name.toLowerCase();
    let extracted: ImportedMemberRow[];
    try {
      if (lowerName.endsWith(".xlsx")) {
        // Un classeur peut avoir plusieurs feuilles (ex: un brouillon et une version à jour) :
        // on extrait chacune et on garde celle qui donne le plus de membres, plutôt que de
        // supposer que la première feuille du classeur est la bonne.
        const sheets = await readXlsxFile(file);
        let best: ImportedMemberRow[] = [];
        for (const { data } of sheets) {
          const candidate = extractMembersFromRows(
            data.map((row) => row.map((cell) => (cell == null ? "" : String(cell))))
          );
          if (candidate.length > best.length) best = candidate;
        }
        extracted = best;
      } else if (lowerName.endsWith(".csv")) {
        const text = await file.text();
        extracted = extractMembersFromCsv(text);
      } else {
        setError("Seuls les fichiers .xlsx (Excel) et .csv sont acceptés.");
        return;
      }
    } catch {
      setError("Ce fichier n'a pas pu être lu — vérifiez qu'il n'est pas corrompu ou protégé par mot de passe.");
      return;
    }

    if (extracted.length === 0) {
      setError("Aucun nom trouvé dans ce fichier.");
      return;
    }
    setFileName(file.name);
    setRawExtracted(extracted);
    setGrouped(true);
    setRemovedKeys(new Set());
  }

  function removeRow(index: number) {
    setRemovedKeys((prev) => new Set(prev).add(index));
  }

  function toggleGrouped(next: boolean) {
    setGrouped(next);
    setRemovedKeys(new Set());
  }

  function cancel() {
    setRawExtracted([]);
    setFileName(null);
    setError(null);
    setRemovedKeys(new Set());
  }

  async function confirmImport() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await importManagedMembersAction(tontineId, rows);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`${result.data.createdCount} membre(s) importé(s).`);
      setRawExtracted([]);
      setFileName(null);
      setRemovedKeys(new Set());
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (rawExtracted.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {error && <Alert variant="destructive">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50">
          <Upload className="h-4 w-4 text-[var(--brand-gold)]" />
          Importer une liste (.xlsx ou .csv)
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,text/csv,text/comma-separated-values,application/csv,application/vnd.ms-excel,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <p className="text-xs text-stone-400">
          Fichier Excel (.xlsx) ou CSV. Colonnes &laquo;&nbsp;Nom&nbsp;&raquo; (ou 1re colonne) et
          &laquo;&nbsp;Téléphone&nbsp;&raquo; (facultative, simple info de contact — jamais utilisée
          pour se connecter).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 p-3">
      <p className="text-sm font-medium text-stone-900">
        {fileName} — {rows.length} membre(s) à importer
      </p>
      {error && <Alert variant="destructive">{error}</Alert>}
      {hasGroupableRows && (
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => toggleGrouped(e.target.checked)}
          />
          Regrouper les lignes &laquo;&nbsp;Nom 1, Nom 2...&nbsp;&raquo; en un seul membre à
          plusieurs bras (même cotisant)
        </label>
      )}
      {duplicateCount > 0 && (
        <Alert variant="warning">
          {duplicateCount} nom(s) ressemblent à un membre déjà présent — vérifiez avant d&apos;importer
          pour éviter un doublon.
        </Alert>
      )}
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {allRows.map((row, i) => {
          if (removedKeys.has(i)) return null;
          const warning = allWarnings[i];
          return (
            <div
              key={i}
              className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${
                warning?.isDuplicate ? "bg-amber-50" : "bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {warning?.isDuplicate && (
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-label="Possible doublon"
                  />
                )}
                {row.fullName}
                {row.bras > 1 && <span className="text-[var(--brand-gold)]"> · {row.bras} bras</span>}
                {row.contactPhone && (
                  <span className={warning?.hasBadPhone ? "text-amber-600" : "text-stone-400"}>
                    · {row.contactPhone}
                    {warning?.hasBadPhone && " (format inhabituel)"}
                  </span>
                )}
              </span>
              <button type="button" onClick={() => removeRow(i)} aria-label={`Retirer ${row.fullName}`}>
                <X className="h-3.5 w-3.5 text-stone-400 hover:text-red-600" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting || rows.length === 0} onClick={confirmImport}>
          {submitting ? "Import..." : `Importer ${rows.length} membre(s)`}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={submitting}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
