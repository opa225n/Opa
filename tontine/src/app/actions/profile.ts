"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.union([z.email(), z.literal("")]).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
});

export async function updateProfileAction(input: unknown) {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const { fullName, email, address, city } = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName,
      email: email && email.length > 0 ? email : null,
      profile: {
        upsert: {
          create: { address, city },
          update: { address, city },
        },
      },
    },
  });

  revalidatePath("/profil");
  return { ok: true as const };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function changePasswordAction(input: unknown) {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Mot de passe invalide (8 caractères minimum)." };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Mot de passe actuel incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { ok: true as const };
}

export async function deactivateAccountAction() {
  const user = await requireUser();

  const activeResponsible = await prisma.tontineMembership.findFirst({
    where: { userId: user.id, role: "RESPONSABLE", status: "ACTIVE", tontine: { status: "ACTIVE" } },
  });
  if (activeResponsible) {
    return {
      ok: false as const,
      error:
        "Vous êtes responsable d'une tontine active. Transférez ce rôle à un autre membre avant de désactiver votre compte.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date() },
  });

  return { ok: true as const };
}
