"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { writeAuditLog } from "@/lib/rbac";

export type SignUpResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof SignUpInput, string[]>> };

export async function signUpAction(input: unknown): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Veuillez corriger les champs invalides.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { fullName, phone, email, password, countryCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec ce numéro de téléphone." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName,
      phone,
      email: email && email.length > 0 ? email : null,
      passwordHash,
      countryCode,
      termsAcceptedAt: new Date(),
      profile: { create: {} },
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "user.signup",
    entityType: "User",
    entityId: user.id,
  });

  return { ok: true };
}
