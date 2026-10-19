"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function AcceptInvitationButton({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const result = await acceptInvitationAction(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/tontines/${result.data.tontineId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button onClick={handleAccept} disabled={loading} size="lg">
        {loading ? "..." : "Rejoindre la tontine"}
      </Button>
    </div>
  );
}
