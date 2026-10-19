"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await resetPasswordAction(values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/connexion"), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        Lien de réinitialisation invalide.{" "}
        <Link href="/mot-de-passe-oublie" className="underline">
          Faire une nouvelle demande
        </Link>
        .
      </Alert>
    );
  }

  if (success) {
    return <Alert variant="success">Mot de passe mis à jour. Redirection vers la connexion...</Alert>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && <Alert variant="destructive">{serverError}</Alert>}
      <input type="hidden" value={token} {...register("token")} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
      </Button>
    </form>
  );
}
