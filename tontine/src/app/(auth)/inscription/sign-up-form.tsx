"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Phone, Users, UserPlus, Eye } from "lucide-react";
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
        <Label htmlFor="fullName">Nom et prénom</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input id="fullName" autoComplete="name" className="pl-9" {...register("fullName")} />
        </div>
        {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            id="phone"
            placeholder="+2250700000000"
            autoComplete="tel"
            className="pl-9"
            {...register("phone")}
          />
        </div>
        {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Je souhaite</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDestination("JOIN")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
              destination === "JOIN"
                ? "border-brand-gold bg-brand-gold/10"
                : "border-stone-200 hover:border-stone-300"
            )}
          >
            <Users className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium text-stone-900">Rejoindre une tontine existante</span>
            <span className="text-xs text-stone-500">Accédez à une tontine grâce à un code.</span>
          </button>
          <button
            type="button"
            onClick={() => setDestination("CREATE")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
              destination === "CREATE"
                ? "border-brand-gold bg-brand-gold/10"
                : "border-stone-200 hover:border-stone-300"
            )}
          >
            <UserPlus className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium text-stone-900">Créer une nouvelle tontine</span>
            <span className="text-xs text-stone-500">Rassemblez vos proches et démarrez.</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail (facultatif)</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="countryCode">Pays de résidence</Label>
        <select
          id="countryCode"
          className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
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
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <div className="flex gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
        <div>
          <p className="text-sm font-medium text-stone-900">Règle de transparence</p>
          <p className="text-sm text-stone-600">
            En rejoignant Tontine CI, vous acceptez que les cotisations, les statuts de paiement
            et les dates soient visibles par les membres de la tontine, selon la règle définie
            par le groupe.
          </p>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input type="checkbox" className="mt-1" {...register("acceptTransparency")} />
        <span>J&apos;accepte la règle de transparence</span>
      </label>
      {errors.acceptTransparency && (
        <p className="text-sm text-red-600">{errors.acceptTransparency.message}</p>
      )}

      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input type="checkbox" className="mt-1" {...register("acceptTerms")} />
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

      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? "Création du compte..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
