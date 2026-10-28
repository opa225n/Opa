"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Phone, Users, UserPlus, Eye, ChevronRight, ArrowRight } from "lucide-react";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { signUpAction } from "@/app/actions/auth";
import { signInAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "FR", label: "France" },
  { code: "SN", label: "Sénégal" },
  { code: "ML", label: "Mali" },
  { code: "BF", label: "Burkina Faso" },
  { code: "US", label: "États-Unis" },
  { code: "CA", label: "Canada" },
  { code: "BE", label: "Belgique" },
];

const fieldInputClass = "h-12 rounded-xl border-stone-200 bg-white text-base";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [destination, setDestination] = useState<"JOIN" | "CREATE">("JOIN");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      countryCode: "CI",
      acceptTerms: false as unknown as true,
      acceptTransparency: false as unknown as true,
    },
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await signUpAction(values);
      if (!result.ok) {
        setServerError(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof SignUpInput, { message: messages[0] });
            }
          }
        }
        return;
      }
      const loginResult = await signInAction({ phone: values.phone, password: values.password });
      if (!loginResult.ok) {
        router.push(next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion");
        return;
      }
      if (next && next.startsWith("/")) {
        router.push(next);
      } else {
        router.push(destination === "CREATE" ? "/tontines/nouveau" : "/rejoindre");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName" className="font-semibold text-[var(--brand)]">
          Nom et prénom
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            id="fullName"
            placeholder="Ex : Konan Antoinette"
            autoComplete="name"
            className={cn(fieldInputClass, "pl-10")}
            {...register("fullName")}
          />
        </div>
        {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone" className="font-semibold text-[var(--brand)]">
          Numéro de téléphone
        </Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            id="phone"
            placeholder="Ex : +225 07 12 34 56 78"
            autoComplete="tel"
            className={cn(fieldInputClass, "pl-10")}
            {...register("phone")}
          />
        </div>
        {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="font-semibold text-[var(--brand)]">Je souhaite</Label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                value: "JOIN" as const,
                icon: Users,
                title: "Rejoindre une tontine existante",
                description: "Accédez à une tontine proche de vous.",
              },
              {
                value: "CREATE" as const,
                icon: UserPlus,
                title: "Créer une nouvelle tontine",
                description: "Rassemblez vos proches et démarrez.",
              },
            ]
          ).map((option) => {
            const selected = destination === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setDestination(option.value)}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
                  selected ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10" : "border-stone-200 bg-white hover:border-stone-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-gold)]/20 text-[var(--brand)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      selected ? "border-[var(--brand-gold)]" : "border-stone-300"
                    )}
                  >
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-gold)]" />}
                  </span>
                </div>
                <span className="text-sm font-semibold text-stone-900">{option.title}</span>
                <span className="text-xs text-stone-500">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="font-semibold text-[var(--brand)]">
          E-mail
        </Label>
        <Input id="email" type="email" autoComplete="email" className={fieldInputClass} {...register("email")} />
        <p className="text-xs text-stone-500">Utilisé pour vérifier votre compte à l&apos;inscription.</p>
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="countryCode" className="font-semibold text-[var(--brand)]">
          Pays de résidence
        </Label>
        <select
          id="countryCode"
          className={cn(fieldInputClass, "w-full px-3")}
          {...register("countryCode")}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.countryCode && <p className="text-sm text-red-600">{errors.countryCode.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="font-semibold text-[var(--brand)]">
          Mot de passe
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className={fieldInputClass}
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <Link
        href="/confidentialite"
        target="_blank"
        className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 transition-colors hover:border-stone-300"
      >
        <Eye className="h-5 w-5 shrink-0 text-[var(--brand-gold)]" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-stone-900">Règle de transparence</p>
          <p className="text-sm text-stone-600">
            En rejoignant Tontine CI, vous acceptez que les cotisations, les statuts de paiement
            et les dates soient visibles par les membres de la tontine, selon la règle définie
            par le groupe.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
      </Link>

      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[var(--brand-gold)]"
          {...register("acceptTransparency")}
        />
        <span>J&apos;accepte la règle de transparence</span>
      </label>
      {errors.acceptTransparency && (
        <p className="text-sm text-red-600">{errors.acceptTransparency.message}</p>
      )}

      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[var(--brand-gold)]"
          {...register("acceptTerms")}
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu" target="_blank" className="text-brand underline-offset-4 hover:underline">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link
            href="/confidentialite"
            target="_blank"
            className="text-brand underline-offset-4 hover:underline"
          >
            politique de confidentialité
          </Link>{" "}
          de Tontine CI.
        </span>
      </label>
      {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>}

      <Button type="submit" variant="gold" disabled={submitting} size="lg" className="w-full rounded-full">
        {submitting ? (
          "Création du compte..."
        ) : (
          <>
            Créer mon compte <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
