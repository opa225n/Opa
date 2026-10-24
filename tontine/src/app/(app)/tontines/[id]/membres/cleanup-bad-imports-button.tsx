"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Merge } from "lucide-react";
import { removeBadImportedMembersAction, mergeBrasFromExistingImportAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function CleanupBadImportsButton({ tontineId }: { tontineId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    if (
      !window.confirm(
        "Retirer tous les membres dont le nom est un simple numéro ou commence par \"Colonne\" (import mal interprété) ? Les vrais membres ne sont pas concernés."
      )
    ) {
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await removeBadImportedMembersAction(tontineId);
      if (!res.ok) {
        setResult(res.error);
        return;
      }
      setResult(
        res.data.removedCount > 0
          ? `${res.data.removedCount} membre(s) mal importé(s) retiré(s).`
          : "Aucun membre à nettoyer."
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={handleClick}>
        <Trash2 className="h-4 w-4 text-red-600" /> Nettoyer un import mal interprété
      </Button>
      {result && <Alert variant="success">{result}</Alert>}
    </div>
  );
}

export function MergeBrasButton({ tontineId }: { tontineId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    if (
      !window.confirm(
        'Fusionner les membres importés sous la forme "Nom 1", "Nom 2"... en un seul membre avec le bon nombre de bras ? Les membres uniques (sans doublon) ne sont pas touchés.'
      )
    ) {
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await mergeBrasFromExistingImportAction(tontineId);
      if (!res.ok) {
        setResult(res.error);
        return;
      }
      setResult(
        res.data.mergedCount > 0
          ? `${res.data.mergedCount} membre(s) fusionné(s) (${res.data.removedCount} doublon(s) retiré(s)).`
          : "Aucun doublon à fusionner."
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={handleClick}>
        <Merge className="h-4 w-4 text-[var(--brand-gold)]" /> Fusionner les bras (Nom 1, Nom 2...)
      </Button>
      {result && <Alert variant="success">{result}</Alert>}
    </div>
  );
}
