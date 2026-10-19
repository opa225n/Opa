"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPayoutAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutConfirmForm({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("CASH");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const result = await confirmPayoutAction(payoutId, { method: method as "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY", transactionRef: ref || undefined });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Marquer comme versé
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-stone-200 p-2">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 rounded border border-stone-300 px-2 text-sm">
        <option value="CASH">Espèces</option>
        <option value="BANK_TRANSFER">Virement</option>
        <option value="MOBILE_MONEY">Mobile Money</option>
      </select>
      <Input placeholder="Référence" value={ref} onChange={(e) => setRef(e.target.value)} className="h-9 w-32" />
      <Button size="sm" disabled={loading} onClick={submit}>
        Confirmer
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Annuler
      </Button>
    </div>
  );
}
