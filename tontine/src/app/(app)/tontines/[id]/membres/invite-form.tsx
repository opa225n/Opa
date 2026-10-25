"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { inviteMemberAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function InviteForm({
  tontineId,
  tontineName,
  appUrl,
}: {
  tontineId: string;
  tontineName: string;
  appUrl: string;
}) {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("MEMBRE");
  const [link, setLink] = useState<string | null>(null);
  const [linkPhone, setLinkPhone] = useState("");
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
      setLinkPhone(phone);
      setPhone("");
    } finally {
      setSubmitting(false);
    }
  }

  // wa.me n'accepte que des chiffres (pas de "+", espaces ou tirets) ; sans numéro, on ouvre le
  // sélecteur de contact natif de WhatsApp (lien sans destinataire) plutôt que de ne rien proposer.
  const whatsappHref = link
    ? `https://wa.me/${linkPhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        `Vous êtes invité(e) à rejoindre la tontine « ${tontineName} » sur Tontine CI. Cliquez pour rejoindre : ${link}`
      )}`
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      {link && (
        <Alert variant="success">
          <div className="flex flex-col gap-2">
            <p>
              Lien d&apos;invitation (valable 7 jours) :{" "}
              <span className="break-all font-mono text-xs">{link}</span>
            </p>
            <a
              href={whatsappHref!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> Partager via WhatsApp
            </a>
          </div>
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
