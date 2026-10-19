"use server";

import { signIn } from "@/lib/auth";
import { signInSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInAction(input: unknown): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Numéro ou mot de passe invalide." };
  }

  const existing = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (existing?.isSuspended) {
    return { ok: false, error: "Ce compte a été suspendu. Contactez le support." };
  }

  try {
    await signIn("credentials", {
      phone: parsed.data.phone,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Numéro ou mot de passe incorrect." };
  }
}
