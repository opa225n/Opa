"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { createVerificationCode, verifyPhoneCode } from "@/lib/phone-verification";
import { isMailerConfigured, sendVerificationEmail } from "@/lib/mailer";

export type RequestPhoneVerificationResult = { ok: true; demoCode?: string } | { ok: false; error: string };

export async function requestPhoneVerificationAction(): Promise<RequestPhoneVerificationResult> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  if (dbUser.phoneVerified) {
    return { ok: false, error: "Ce numéro est déjà vérifié." };
  }

  const { code } = await createVerificationCode(user.id);

  // L'email est obligatoire à l'inscription depuis l'ajout de ce canal de vérification (l'envoi
  // de SMS dépend du solde du portefeuille Bird, celui des emails est beaucoup moins coûteux et
  // déjà fonctionnel) ; un compte créé avant ce changement peut encore ne pas en avoir.
  if (!dbUser.email || !isMailerConfigured()) {
    return { ok: true, demoCode: code };
  }

  try {
    await sendVerificationEmail({ to: dbUser.email, code });
    return { ok: true };
  } catch (error) {
    console.error("[phone-verification] Échec de l'envoi de l'email de vérification, repli en mode démo.", error);
    return { ok: true, demoCode: code };
  }
}

const confirmSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Code à 6 chiffres requis.") });

export type ConfirmPhoneVerificationResult = { ok: true } | { ok: false; error: string };

export async function confirmPhoneVerificationAction(
  input: unknown
): Promise<ConfirmPhoneVerificationResult> {
  const user = await requireUser();
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Code invalide." };
  }

  return verifyPhoneCode(user.id, parsed.data.code);
}
