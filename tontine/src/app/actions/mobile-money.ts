"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership, writeAuditLog, ForbiddenError } from "@/lib/rbac";
import { initiateMobileMoneySchema, type InitiateMobileMoneyInput } from "@/lib/validations/mobile-money";
import { initiateMobileMoneyPayment } from "@/lib/payments/service";
import { processProviderWebhook } from "@/lib/payments/webhook-processor";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function initiateMobileMoneyPaymentAction(
  input: unknown
): Promise<ActionResult<{ paymentId: string; isDemo: boolean; providerRef: string }>> {
  const parsed = initiateMobileMoneySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
  }
  const data: InitiateMobileMoneyInput = parsed.data;

  const contribution = await prisma.contribution.findUniqueOrThrow({
    where: { id: data.contributionId },
  });
  const { user, membership: actor } = await requireMembership(contribution.tontineId);

  const isSelf = contribution.membershipId === actor.id;
  const canManage = ["RESPONSABLE", "TRESORIER"].includes(actor.role);
  if (!isSelf && !canManage) {
    throw new ForbiddenError(
      "Vous ne pouvez initier un paiement Mobile Money que pour votre propre cotisation."
    );
  }

  const remaining = contribution.amountExpectedXof - contribution.amountConfirmedXof;
  if (remaining <= 0) {
    return fail("Cette cotisation est déjà entièrement confirmée.");
  }

  const { providerRef, isDemo } = await initiateMobileMoneyPayment(data.providerCode, {
    merchantReference: contribution.id,
    amountXof: data.amountXof,
    payerPhone: user.phone ?? "",
  });

  const payment = await prisma.payment.create({
    data: {
      contributionId: data.contributionId,
      amountXof: data.amountXof,
      method: "MOBILE_MONEY",
      status: "DECLARED",
      isManualEntry: true, // ne devient false qu'à la confirmation par webhook (réel ou démo)
      paidAt: new Date(),
      transactionRef: providerRef,
      providerCode: data.providerCode,
      recordedById: user.id,
      notes: isDemo ? "[DÉMO] Initié en mode démonstration, aucun transfert réel." : undefined,
    },
  });

  await writeAuditLog({
    tontineId: contribution.tontineId,
    userId: user.id,
    action: "payment.mobile_money_initiate",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { providerCode: data.providerCode, providerRef, isDemo },
  });

  revalidatePath(`/tontines/${contribution.tontineId}/cotisations`);
  return { ok: true, data: { paymentId: payment.id, isDemo, providerRef } };
}

/**
 * Simule la notification asynchrone qu'un vrai prestataire Mobile Money envoie une fois le
 * paiement validé par le payeur sur son téléphone (USSD/app). Passe par EXACTEMENT la même
 * logique de traitement que le webhook réel (src/lib/payments/webhook-processor.ts) : rien
 * n'est "confirmé en douce", le chemin est identique, seule la source du déclenchement change.
 */
export async function simulateMobileMoneyCallbackAction(
  paymentId: string,
  outcome: "SUCCESS" | "FAILED"
): Promise<ActionResult> {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { contribution: true },
  });

  if (payment.method !== "MOBILE_MONEY" || !payment.providerCode || !payment.transactionRef) {
    return fail("Ce paiement n'est pas une transaction Mobile Money.");
  }

  const { user, membership: actor } = await requireMembership(payment.contribution.tontineId);
  const isInitiator = payment.recordedById === user.id;
  const canManage = ["RESPONSABLE", "TRESORIER"].includes(actor.role);
  if (!isInitiator && !canManage) {
    throw new ForbiddenError("Vous ne pouvez pas simuler la confirmation de ce paiement.");
  }

  const result = await processProviderWebhook({
    providerCode: payment.providerCode,
    externalEventId: `demo-${paymentId}-${Date.now()}`,
    providerRef: payment.transactionRef,
    outcome,
    failureReason: outcome === "FAILED" ? "Échec simulé (mode démonstration)." : undefined,
    rawPayload: { demo: true, outcome },
    signatureValid: true,
    isDemo: true,
  });

  if (!result.ok) {
    return fail(`Simulation impossible : ${result.reason}.`);
  }

  revalidatePath(`/tontines/${payment.contribution.tontineId}/cotisations`);
  return { ok: true, data: undefined };
}
