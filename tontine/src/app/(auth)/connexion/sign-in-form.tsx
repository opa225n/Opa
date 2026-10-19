"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { signInAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await signInAction(values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input id="phone" placeholder="+2250700000000" autoComplete="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mot de passe</Label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
