"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { signUpAction } from "@/app/actions/auth";
import { signInAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { countryCode: "CI", acceptTerms: false as unknown as true },
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
      if (loginResult.ok) {
        router.push(next && next.startsWith("/") ? next : "/dashboard");
      } else {
        router.push(next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input id="fullName" autoComplete="name" {...register("fullName")} />
        {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input id="phone" placeholder="+2250700000000" autoComplete="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
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

      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input type="checkbox" className="mt-1" {...register("acceptTerms")} />
        <span>
          J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité de
          Tontine CI.
        </span>
      </label>
      {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>}

      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? "Création du compte..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
