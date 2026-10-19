import "server-only";
import { Prisma, type PaymentProviderCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeContribution } from "@/lib/tontine-engine";
import { writeAuditLog } from "@/lib/audit-log";

export interface NormalizedWebhookPayload {
  providerCode: PaymentProviderCode;
  /** Identifiant unique de l'évènement côté prestataire — clé d'idempotence. */
  externalEventId: string;
  /** Référence de la transaction, doit correspondre à Payment.transactionRef. */
  providerRef: string;
  outcome: "SUCCESS" | "FAILED" | "REFUNDED";
  failureReason?: string;
  rawPayload: unknown;
  /** Résultat de la vérification de signature, faite par l'appelant (route webhook). */
  signatureValid: boolean;
  isDemo?: boolean;
}

export type WebhookProcessingResult =
  | { ok: true; duplicate: true }
  | { ok: true; duplicate: false; paymentId: string }
  | { ok: false; reason: "invalid_signature" | "payment_not_found" | "already_finalized" };

/**
 * Traite un évènement webhook de paiement Mobile Money de façon idempotente et traçable.
 * Utilisée à la fois par les routes webhook réelles (src/app/api/webhooks/mobile-money/...)
 * et par la simulation du mode démonstration, afin que les deux chemins passent exactement
 * par la même logique métier (aucun paiement n'est jamais confirmé "en douce").
 */
export async function processProviderWebhook(
  payload: NormalizedWebhookPayload
): Promise<WebhookProcessingResult> {
  let event;
  try {
    event = await prisma.paymentWebhookEvent.create({
      data: {
        providerCode: payload.providerCode,
        externalEventId: payload.externalEventId,
        rawPayload: payload.rawPayload as Prisma.InputJsonValue,
        signatureValid: payload.signatureValid,
        isDemo: payload.isDemo ?? false,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Livraison dupliquée du même évènement (retry réseau côté prestataire) : no-op.
      return { ok: true, duplicate: true };
    }
    throw error;
  }

  if (!payload.signatureValid) {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { processingError: "Signature invalide : évènement ignoré." },
    });
    return { ok: false, reason: "invalid_signature" };
  }

  const payment = await prisma.payment.findFirst({
    where: {
      transactionRef: payload.providerRef,
      providerCode: payload.providerCode,
      method: "MOBILE_MONEY",
    },
    include: { contribution: true },
  });

  if (!payment) {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { processingError: `Aucun paiement trouvé pour la référence ${payload.providerRef}.` },
    });
    return { ok: false, reason: "payment_not_found" };
  }

  if (payload.outcome !== "REFUNDED" && ["CONFIRMED", "REJECTED", "CANCELLED"].includes(payment.status)) {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { processingError: `Paiement ${payment.id} déjà finalisé (${payment.status}).` },
    });
    return { ok: false, reason: "already_finalized" };
  }
  if (payload.outcome === "REFUNDED" && payment.status !== "CONFIRMED") {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { processingError: `Remboursement reçu pour un paiement non confirmé (${payment.status}).` },
    });
    return { ok: false, reason: "already_finalized" };
  }

  const now = new Date();

  if (payload.outcome === "SUCCESS") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "CONFIRMED",
        isManualEntry: false,
        providerEventId: event.id,
        validatedAt: now,
      },
    });
    await recomputeContribution(payment.contributionId);
    await prisma.notification.create({
      data: {
        userId: payment.recordedById,
        tontineId: payment.contribution.tontineId,
        type: "PAYMENT_CONFIRMED",
        title: "Paiement Mobile Money confirmé",
        body: `Le prestataire a confirmé votre paiement de ${payment.amountXof.toLocaleString("fr-FR")} FCFA.`,
      },
    });
    await writeAuditLog({
      tontineId: payment.contribution.tontineId,
      action: payload.isDemo ? "payment.webhook_confirm_demo" : "payment.webhook_confirm",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { providerCode: payload.providerCode, providerRef: payload.providerRef },
    });
  } else if (payload.outcome === "FAILED") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        rejectionReason: payload.failureReason ?? "Échec signalé par le prestataire.",
        providerEventId: event.id,
        validatedAt: now,
      },
    });
    await recomputeContribution(payment.contributionId);
    await prisma.notification.create({
      data: {
        userId: payment.recordedById,
        tontineId: payment.contribution.tontineId,
        type: "PAYMENT_REJECTED",
        title: "Paiement Mobile Money échoué",
        body: payload.failureReason ?? "Le prestataire a signalé un échec du paiement.",
      },
    });
    await writeAuditLog({
      tontineId: payment.contribution.tontineId,
      action: payload.isDemo ? "payment.webhook_fail_demo" : "payment.webhook_fail",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { providerCode: payload.providerCode, providerRef: payload.providerRef },
    });
  } else {
    // REFUNDED
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundedAt: now,
        refundReference: payload.providerRef,
        providerEventId: event.id,
      },
    });
    await recomputeContribution(payment.contributionId);
    await writeAuditLog({
      tontineId: payment.contribution.tontineId,
      action: payload.isDemo ? "payment.webhook_refund_demo" : "payment.webhook_refund",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { providerCode: payload.providerCode, providerRef: payload.providerRef },
    });
  }

  await prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { processedAt: now } });

  return { ok: true, duplicate: false, paymentId: payment.id };
}
