"use client";

import { useState } from "react";
import { inviteMemberAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function InviteForm({ tontineId, appUrl }: { tontineId: string; appUrl: string }) {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("MEMBRE");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await inviteMemberAction({ tontineId, phone, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLink(`${appUrl}/rejoindre/${result.data.code}`);
      setPhone("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      {link && (
        <Alert variant="success">
          Lien d&apos;invitation (valable 7 jours) :{" "}
          <span className="break-all font-mono text-xs">{link}</span>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-phone">Téléphone du membre (facultatif)</Label>
          <Input
            id="invite-phone"
            placeholder="+2250700000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Rôle</Label>
          <select
            id="invite-role"
            className="h-11 rounded-lg border border-stone-300 bg-white px-3"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="MEMBRE">Membre</option>
            <option value="TRESORIER">Trésorier</option>
            <option value="SECRETAIRE">Secrétaire</option>
            <option value="RESPONSABLE">Responsable</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "..." : "Générer un lien"}
          </Button>
        </div>
      </div>
    </form>
  );
}
