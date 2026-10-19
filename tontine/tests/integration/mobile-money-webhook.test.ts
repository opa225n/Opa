import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { processProviderWebhook } from "@/lib/payments/webhook-processor";

describe("processProviderWebhook (traitement idempotent des webhooks Mobile Money)", () => {
  // Préfixe aléatoire par exécution : évite toute collision avec des PaymentWebhookEvent
  // laissés par une exécution précédente de cette suite (les id d'évènement sont uniques
  // par (providerCode, externalEventId), pas par exécution de test).
  const runId = Math.random().toString(36).slice(2, 10);
  const evt = (name: string) => `${runId}-${name}`;

  let userId: string;
  let tontineId: string;
  let contributionId: string;

  async function makePayment(amountXof: number, transactionRef: string) {
    return prisma.payment.create({
      data: {
        contributionId,
        amountXof,
        method: "MOBILE_MONEY",
        status: "DECLARED",
        isManualEntry: true,
        paidAt: new Date(),
        transactionRef,
        providerCode: "ORANGE_MONEY",
        recordedById: userId,
      },
    });
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        phone: "+225070004001",
        fullName: "[TEST] Mobile Money",
        passwordHash: await bcrypt.hash("password1234", 4),
        countryCode: "CI",
      },
    });
    userId = user.id;

    const tontine = await prisma.tontine.create({
      data: {
        name: "[TEST] Tontine Mobile Money",
        type: "ROTATIVE",
        status: "ACTIVE",
        contributionAmountXof: 10000,
        frequency: "MONTHLY",
        startDate: new Date(),
        createdById: userId,
      },
    });
    tontineId = tontine.id;

    const membership = await prisma.tontineMembership.create({
      data: { tontineId, userId, role: "MEMBRE", status: "ACTIVE" },
    });
    const cycle = await prisma.tontineCycle.create({
      data: { tontineId, periodIndex: 1, periodStart: new Date(), periodDue: new Date(), status: "ACTIVE" },
    });
    const contribution = await prisma.contribution.create({
      data: { tontineId, cycleId: cycle.id, membershipId: membership.id, amountExpectedXof: 10000, status: "DUE" },
    });
    contributionId = contribution.id;
  });

  afterAll(async () => {
    await prisma.paymentWebhookEvent
      .deleteMany({ where: { externalEventId: { startsWith: `${runId}-` } } })
      .catch(() => {});
    await prisma.tontine.delete({ where: { id: tontineId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  it("rejette un évènement à signature invalide sans toucher au paiement", async () => {
    const payment = await makePayment(10000, "MM-REF-SIG-INVALID");
    const result = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("sig-invalid"),
      providerRef: "MM-REF-SIG-INVALID",
      outcome: "SUCCESS",
      rawPayload: {},
      signatureValid: false,
    });
    expect(result).toEqual({ ok: false, reason: "invalid_signature" });

    const unchanged = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(unchanged.status).toBe("DECLARED");
  });

  it("renvoie payment_not_found si aucune transaction ne correspond à la référence", async () => {
    const result = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("unknown-ref"),
      providerRef: "REF-QUI-N-EXISTE-PAS",
      outcome: "SUCCESS",
      rawPayload: {},
      signatureValid: true,
    });
    expect(result).toEqual({ ok: false, reason: "payment_not_found" });
  });

  it("confirme le paiement et recalcule la cotisation sur un évènement SUCCESS", async () => {
    const payment = await makePayment(10000, "MM-REF-SUCCESS");
    const result = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("success-1"),
      providerRef: "MM-REF-SUCCESS",
      outcome: "SUCCESS",
      rawPayload: { ok: true },
      signatureValid: true,
      isDemo: true,
    });
    expect(result).toEqual({ ok: true, duplicate: false, paymentId: payment.id });

    const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updated.status).toBe("CONFIRMED");
    expect(updated.isManualEntry).toBe(false);
    expect(updated.providerEventId).not.toBeNull();

    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
    expect(contribution.amountConfirmedXof).toBeGreaterThanOrEqual(10000);
  });

  it("ignore une livraison dupliquée du même évènement (idempotence)", async () => {
    const payment = await makePayment(5000, "MM-REF-DUP");
    const first = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("dup-1"),
      providerRef: "MM-REF-DUP",
      outcome: "SUCCESS",
      rawPayload: {},
      signatureValid: true,
    });
    expect(first).toEqual({ ok: true, duplicate: false, paymentId: payment.id });

    const second = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("dup-1"), // même id d'évènement
      providerRef: "MM-REF-DUP",
      outcome: "SUCCESS",
      rawPayload: {},
      signatureValid: true,
    });
    expect(second).toEqual({ ok: true, duplicate: true });

    const payments = await prisma.payment.findMany({ where: { transactionRef: "MM-REF-DUP" } });
    expect(payments).toHaveLength(1); // aucun doublon créé, aucune double confirmation
  });

  it("rejette le paiement sur un évènement FAILED avec le motif du prestataire", async () => {
    const payment = await makePayment(10000, "MM-REF-FAILED");
    await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("failed-1"),
      providerRef: "MM-REF-FAILED",
      outcome: "FAILED",
      failureReason: "Solde insuffisant.",
      rawPayload: {},
      signatureValid: true,
    });

    const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updated.status).toBe("REJECTED");
    expect(updated.rejectionReason).toBe("Solde insuffisant.");
  });

  it("refuse de traiter un nouvel évènement sur un paiement déjà finalisé", async () => {
    const payment = await makePayment(10000, "MM-REF-ALREADY-DONE");
    await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("already-1"),
      providerRef: "MM-REF-ALREADY-DONE",
      outcome: "SUCCESS",
      rawPayload: {},
      signatureValid: true,
    });

    const result = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("already-2"), // évènement différent, même transaction déjà finalisée
      providerRef: "MM-REF-ALREADY-DONE",
      outcome: "FAILED",
      rawPayload: {},
      signatureValid: true,
    });
    expect(result).toEqual({ ok: false, reason: "already_finalized" });

    const unchanged = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(unchanged.status).toBe("CONFIRMED"); // pas écrasé par le FAILED tardif
  });

  it("traite un remboursement sur un paiement confirmé et retire le montant confirmé", async () => {
    const payment = await makePayment(10000, "MM-REF-REFUND");
    await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("refund-confirm"),
      providerRef: "MM-REF-REFUND",
      outcome: "SUCCESS",
      rawPayload: {},
      signatureValid: true,
    });

    const result = await processProviderWebhook({
      providerCode: "ORANGE_MONEY",
      externalEventId: evt("refund-1"),
      providerRef: "MM-REF-REFUND",
      outcome: "REFUNDED",
      rawPayload: {},
      signatureValid: true,
    });
    expect(result).toEqual({ ok: true, duplicate: false, paymentId: payment.id });

    const refunded = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(refunded.status).toBe("REFUNDED");
    expect(refunded.refundedAt).not.toBeNull();
  });
});
