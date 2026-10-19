"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptRulesAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";

export function AcceptRulesButton({ rulesId }: { rulesId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      await acceptRulesAction(rulesId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleAccept} disabled={loading} size="sm">
      {loading ? "..." : "J'accepte le règlement"}
    </Button>
  );
}
