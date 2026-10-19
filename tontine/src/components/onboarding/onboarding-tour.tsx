"use client";

import { useState } from "react";
import { LayoutDashboard, Wallet, CalendarClock, Bell, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TontineMark } from "@/components/brand/logo";
import { completeOnboardingAction } from "@/app/actions/onboarding";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Tableau de bord",
    description: "En un coup d'œil : vos tontines actives, vos prochaines cotisations et l'état de vos paiements.",
  },
  {
    icon: Users,
    title: "Mes tontines",
    description: "Créez une tontine, invitez des membres et suivez le rôle de chacun (responsable, trésorier, membre).",
  },
  {
    icon: Wallet,
    title: "Cotisations & paiements",
    description: "Déclarez un paiement en espèces ou par Mobile Money, et suivez sa validation par le trésorier.",
  },
  {
    icon: CalendarClock,
    title: "Calendrier des bénéficiaires",
    description: "Visualisez l'ordre et les dates de chaque tour, pour savoir qui reçoit et quand.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Rappels de cotisation, validations de paiement et annonces importantes de vos tontines.",
  },
  {
    icon: UserRound,
    title: "Profil",
    description: "Mettez à jour vos informations personnelles et vos coordonnées de contact.",
  },
] as const;

export function OnboardingTour() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  async function finish() {
    setPending(true);
    setOpen(false);
    await completeOnboardingAction();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <div className="flex items-center gap-2">
            <TontineMark size={22} />
            <span className="font-display text-sm font-semibold text-[var(--brand)]">
              Découvrir Tontine CI
            </span>
          </div>
          <button
            type="button"
            aria-label="Fermer le guide"
            onClick={finish}
            disabled={pending}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-gold)]/15 text-[var(--brand)]">
            <Icon size={28} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">{current.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{current.description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-[var(--brand)]" : "w-1.5 bg-stone-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-stone-100 p-4">
          <Button type="button" variant="ghost" size="sm" onClick={finish} disabled={pending}>
            Passer
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                Précédent
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              disabled={pending}
            >
              {isLast ? "Terminer" : "Suivant"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
