"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export async function completeOnboardingAction() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingSeenAt: new Date() },
  });
  return { ok: true as const };
}
