"use client";

import { useState } from "react";
import { addManagedMemberAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function AddManagedMemberForm({ tontineId }: { tontineId: string }) {
  const [fullName, setFullName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const result = await addManagedMemberAction(tontineId, fullName, contactPhone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFullName("");
      setContactPhone("");
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">Membre ajouté.</Alert>}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="managed-full-name">Nom / surnom</Label>
          <Input
            id="managed-full-name"
            placeholder="Ex : Yacou bache 2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="managed-contact-phone">Téléphone (facultatif)</Label>
          <Input
            id="managed-contact-phone"
            placeholder="Ex : 07 00 00 00 00"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={submitting || fullName.trim().length < 2}>
            {submitting ? "..." : "Ajouter"}
          </Button>
        </div>
      </div>
    </form>
  );
}
