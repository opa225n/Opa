"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0) return;
    router.push(`/rejoindre/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invitation-code">Code d&apos;invitation</Label>
        <Input
          id="invitation-code"
          placeholder="Ex : K7H4P9QXRT"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center font-mono text-lg tracking-widest uppercase"
        />
      </div>
      <Button type="submit" size="lg" disabled={code.trim().length === 0}>
        Continuer
      </Button>
    </form>
  );
}
