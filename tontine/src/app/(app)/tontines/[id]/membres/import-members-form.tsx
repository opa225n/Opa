"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { importManagedMembersAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { extractMembersFromCsv, type ImportedMemberRow } from "@/lib/csv";

export function ImportMembersForm({ tontineId }: { tontineId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<ImportedMemberRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSuccess(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Seuls les fichiers .csv sont acceptés (depuis Excel : Fichier > Enregistrer sous > CSV).");
      return;
    }

    const text = await file.text();
    const extracted = extractMembersFromCsv(text);
    if (extracted.length === 0) {
      setError("Aucun nom trouvé dans ce fichier.");
      return;
    }
    setFileName(file.name);
    setRows(extracted);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function cancel() {
    setRows([]);
    setFileName(null);
    setError(null);
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
      setRows([]);
      setFileName(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {error && <Alert variant="destructive">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50">
          <Upload className="h-4 w-4 text-[var(--brand-gold)]" />
          Importer une liste (.csv)
          <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </label>
        <p className="text-xs text-stone-400">
          Colonnes &laquo;&nbsp;Nom&nbsp;&raquo; (ou 1re colonne) et &laquo;&nbsp;Téléphone&nbsp;&raquo;
          (facultative, simple info de contact — jamais utilisée pour se connecter).
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
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between rounded-md bg-stone-50 px-2 py-1 text-sm">
            <span>
              {row.fullName}
              {row.contactPhone && <span className="text-stone-400"> · {row.contactPhone}</span>}
            </span>
            <button type="button" onClick={() => removeRow(i)} aria-label={`Retirer ${row.fullName}`}>
              <X className="h-3.5 w-3.5 text-stone-400 hover:text-red-600" />
            </button>
          </div>
        ))}
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
