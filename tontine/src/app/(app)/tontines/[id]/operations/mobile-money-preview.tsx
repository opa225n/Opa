"use client";

import { useState } from "react";
import { Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = [
  { code: "ORANGE_MONEY", label: "Orange Money" },
  { code: "MTN_MOMO", label: "MTN MoMo" },
  { code: "MOOV_MONEY", label: "Moov Money" },
  { code: "WAVE", label: "Wave" },
] as const;

type Step = "idle" | "connecting" | "confirm" | "done";

/**
 * Aperçu purement visuel (aucun appel réseau, aucune écriture en base) du futur paiement
 * Mobile Money en un clic — à remplacer par le vrai flux une fois les comptes marchands
 * Wave/Orange Money activés (cf. src/lib/payments/providers).
 */
export function MobileMoneyPreview() {
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["code"]>("ORANGE_MONEY");
  const [step, setStep] = useState<Step>("idle");

  function play() {
    setStep("connecting");
    setTimeout(() => setStep("confirm"), 1200);
    setTimeout(() => setStep("done"), 2600);
  }

  function reset() {
    setStep("idle");
  }

  return (
    <Card className="border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[var(--brand-gold)]" /> Paiement Mobile Money
          </CardTitle>
          <Badge variant="secondary">Bientôt disponible</Badge>
        </div>
        <CardDescription>
          Aperçu de ce qui arrive : payer sa cotisation en un clic, directement depuis l&apos;app,
          sans attendre la confirmation manuelle du responsable.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {step === "idle" && (
          <>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setProvider(p.code)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    provider === p.code
                      ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="gold" className="w-fit" onClick={play}>
              Payer 10 000 FCFA (démo)
            </Button>
          </>
        )}

        {step === "connecting" && (
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-gold)]" /> Connexion à{" "}
            {PROVIDERS.find((p) => p.code === provider)?.label}…
          </div>
        )}

        {step === "confirm" && (
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Smartphone className="h-4 w-4 animate-pulse text-[var(--brand-gold)]" /> Confirmez le
            paiement sur votre téléphone…
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Paiement reçu et confirmé automatiquement.
            </p>
            <Button size="sm" variant="ghost" onClick={reset}>
              Revoir l&apos;aperçu
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
