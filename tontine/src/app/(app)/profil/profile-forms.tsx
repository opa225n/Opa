"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, changePasswordAction, deactivateAccountAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function UpdateProfileForm({
  initial,
}: {
  initial: { fullName: string; email: string; address: string; city: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Profil mis à jour." });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {message && <Alert variant={message.type === "error" ? "destructive" : "success"}>{message.text}</Alert>}
      <div className="flex flex-col gap-1.5">
        <Label>Nom complet</Label>
        <Input value={values.fullName} onChange={(e) => setValues({ ...values, fullName: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>E-mail</Label>
        <Input
          type="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Ville</Label>
          <Input value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Adresse</Label>
          <Input value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "..." : "Enregistrer"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await changePasswordAction({ currentPassword, newPassword });
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Mot de passe modifié." });
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {message && <Alert variant={message.type === "error" ? "destructive" : "success"}>{message.text}</Alert>}
      <div className="flex flex-col gap-1.5">
        <Label>Mot de passe actuel</Label>
        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Nouveau mot de passe</Label>
        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "..." : "Changer le mot de passe"}
      </Button>
    </form>
  );
}

export function DeactivateAccountButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    if (!confirm("Désactiver définitivement votre compte ? Cette action est irréversible pour vous-même.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await deactivateAccountAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button variant="destructive" disabled={loading} onClick={handleDeactivate} className="w-fit">
        Désactiver mon compte
      </Button>
    </div>
  );
}
