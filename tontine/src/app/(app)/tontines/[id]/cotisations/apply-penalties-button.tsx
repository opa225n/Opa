"use client";

import { useState, useTransition } from "react";
import { applyLatePenaltiesAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";

export function ApplyPenaltiesButton({ tontineId }: { tontineId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await applyLatePenaltiesAction(tontineId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.data.count > 0
          ? `${result.data.count} cotisation(s) en retard pénalisée(s).`
          : "Aucune cotisation en retard à pénaliser pour le moment."
      );
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Application..." : "Appliquer les pénalités de retard"}
      </Button>
      {message && <span className="text-sm text-stone-600">{message}</span>}
    </div>
  );
}
