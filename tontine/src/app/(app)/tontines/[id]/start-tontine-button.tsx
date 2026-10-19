"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startTontineAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";

export function StartTontineButton({ tontineId }: { tontineId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!confirm("Démarrer la tontine ? Le calendrier des tours sera généré et ne pourra plus être modifié librement.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await startTontineAction(tontineId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleStart} disabled={loading} variant="secondary">
        {loading ? "Démarrage..." : "Démarrer la tontine"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
