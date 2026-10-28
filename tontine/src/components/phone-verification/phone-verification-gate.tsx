"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestPhoneVerificationAction,
  confirmPhoneVerificationAction,
} from "@/app/actions/phone-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { TontineMark } from "@/components/brand/logo";

export function PhoneVerificationGate({ phone, email }: { phone: string; email: string | null }) {
  const router = useRouter();
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [requested, setRequested] = useState(false);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const result = await requestPhoneVerificationAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDemoCode(result.demoCode ?? null);
      setInfo(result.demoCode ? null : "Code envoyé par e-mail.");
      setRequested(true);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- envoi du premier code au montage
    sendCode();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const result = await confirmPhoneVerificationAction({ code });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <TontineMark size={32} />
          <h1 className="font-display text-lg font-semibold text-[var(--foreground)]">
            Vérifiez votre compte
          </h1>
          <p className="text-sm text-stone-600">
            Entrez le code à 6 chiffres envoyé {email ? (
              <>
                à <strong>{email}</strong>
              </>
            ) : (
              "par e-mail"
            )}{" "}
            pour activer le compte lié au numéro <strong>{phone}</strong>.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            {error}
          </Alert>
        )}
        {info && (
          <Alert variant="success" className="mt-4">
            {info}
          </Alert>
        )}
        {demoCode && (
          <Alert variant="warning" className="mt-4">
            [DÉMO] Envoi d&apos;e-mail indisponible : votre code est <strong>{demoCode}</strong>
          </Alert>
        )}

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code de vérification</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>
          <Button type="submit" size="lg" disabled={verifying || code.length !== 6}>
            {verifying ? "Vérification..." : "Vérifier"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={sendCode}
            disabled={sending || !requested}
          >
            {sending ? "Envoi..." : "Renvoyer le code"}
          </Button>
        </form>
      </div>
    </div>
  );
}
