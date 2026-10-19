"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { createVerificationCode, verifyPhoneCode } from "@/lib/phone-verification";
import { isSmsConfigured, sendVerificationSms } from "@/lib/sms";

export type RequestPhoneVerificationResult = { ok: true; demoCode?: string } | { ok: false; error: string };

export async function requestPhoneVerificationAction(): Promise<RequestPhoneVerificationResult> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  if (dbUser.phoneVerified) {
    return { ok: false, error: "Ce numéro est déjà vérifié." };
  }

  const { code } = await createVerificationCode(user.id);

  if (!isSmsConfigured()) {
    return { ok: true, demoCode: code };
  }

  try {
    await sendVerificationSms({ to: dbUser.phone, code });
    return { ok: true };
  } catch (error) {
    // Le pays de destination ou le portefeuille Bird peuvent ne pas être prêts : on retombe sur
    // le mode démo plutôt que de laisser l'utilisateur bloqué.
    console.error("[phone-verification] Échec de l'envoi SMS, repli en mode démo.", error);
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
