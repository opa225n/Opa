"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordResetSchema, type RequestPasswordResetInput } from "@/lib/validations/auth";
import { requestPasswordResetAction } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function RequestResetForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  async function onSubmit(values: RequestPasswordResetInput) {
    setSubmitting(true);
    try {
      const result = await requestPasswordResetAction(values);
      setMessage(result.message);
      setDemoResetUrl(result.demoResetUrl ?? null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input id="phone" placeholder="+2250700000000" autoComplete="tel" {...register("phone")} />
          {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
        </div>
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Envoi..." : "Envoyer le lien"}
        </Button>
      </form>

      {message && <Alert variant="success">{message}</Alert>}

      {demoResetUrl && (
        <Alert variant="warning">
          <p className="mb-2 font-medium">
            [DÉMO] Aucun service d&apos;envoi d&apos;email n&apos;est configuré : voici le lien
            directement.
          </p>
          <a href={demoResetUrl} className="break-all underline">
            {demoResetUrl}
          </a>
        </Alert>
      )}
    </div>
  );
}
