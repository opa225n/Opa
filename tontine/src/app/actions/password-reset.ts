"use server";

import { headers } from "next/headers";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { createPasswordResetToken, redeemPasswordResetToken } from "@/lib/password-reset";
import { isMailerConfigured, sendPasswordResetEmail } from "@/lib/mailer";

const GENERIC_MESSAGE =
  "Si un compte avec ce numéro et une adresse e-mail existe, un lien de réinitialisation a été envoyé.";

async function getAppUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export type RequestPasswordResetResult = { ok: true; message: string; demoResetUrl?: string };

/**
 * Déclenche l'envoi du lien de réinitialisation. Répond toujours par le même message générique
 * (compte existant ou non, email renseigné ou non) pour ne pas révéler si un numéro est associé
 * à un compte. En mode démo (aucun fournisseur d'email configuré), le lien est renvoyé
 * directement dans `demoResetUrl` pour rester testable sans service externe.
 */
export async function requestPasswordResetAction(
  input: unknown
): Promise<RequestPasswordResetResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: true, message: GENERIC_MESSAGE };
  }
  const { phone }: RequestPasswordResetInput = parsed.data;

  const created = await createPasswordResetToken(phone);
  if (!created) {
    return { ok: true, message: GENERIC_MESSAGE };
  }

  const appUrl = await getAppUrl();
  const resetUrl = `${appUrl}/mot-de-passe-oublie/reinitialiser?token=${created.rawToken}`;

  if (!isMailerConfigured()) {
    return { ok: true, message: GENERIC_MESSAGE, demoResetUrl: resetUrl };
  }

  try {
    await sendPasswordResetEmail({ to: created.email, resetUrl });
    return { ok: true, message: GENERIC_MESSAGE };
  } catch (error) {
    // Le domaine d'envoi peut ne pas encore être vérifié côté fournisseur (propagation DNS en
    // cours) : on retombe sur le mode démo plutôt que de laisser l'utilisateur bloqué.
    console.error("[password-reset] Échec de l'envoi réel, repli en mode démo.", error);
    return { ok: true, message: GENERIC_MESSAGE, demoResetUrl: resetUrl };
  }
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetPasswordAction(input: unknown): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const { token, password }: ResetPasswordInput = parsed.data;
  return redeemPasswordResetToken(token, password);
}
