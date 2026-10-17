import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { Errors } from "../../common/errors";
import { Accounts, writeLedgerTransaction, type LedgerLine } from "../ledger/ledger.service";
import { notify } from "../notifications/notifications.service";
import { simulatedPaymentProvider } from "../../providers/payments/simulated";

const OPERATOR_FEE_BPS = 100n; // 1% (basis points / 10000), simplifié pour la démo

export function computeFee(amount: bigint): bigint {
  const fee = (amount * OPERATOR_FEE_BPS) / 10000n;
  return fee < 25n ? 25n : fee; // frais minimum symbolique
}

/**
 * Lance le paiement Mobile Money d'une cotisation (cf. parcours P4, écran E33).
 * Un seul paiement "ouvert" par cotisation à la fois (cf. TRD : contrainte unique sur contributions en attente).
 */
export async function initiateContributionPayment(
  contributionId: string,
  userId: string,
  operator: string,
  momoNumber: string,
) {
  const contribution = await prisma.contribution.findUniqueOrThrow({
    where: { id: contributionId },
    include: { membership: { include: { tontine: true } }, round: true },
  });
  if (contribution.membership.userId !== userId) throw Errors.notAMember();
  if (contribution.membership.tontine.suspendedAt) {
    throw Errors.forbidden("Cette tontine a été suspendue par l'équipe Tontine, les paiements sont bloqués.");
  }
  if (contribution.status === "paid") throw Errors.contributionAlreadyPaid();
  if (contribution.round.status !== "open") throw Errors.roundNotOpen();

  const existingPending = await prisma.payment.findFirst({
    where: { contributionId, status: { in: ["initiated", "pending"] } },
  });
  if (existingPending) throw Errors.paymentAlreadyPending();

  const amount = contribution.amountDue + contribution.penaltyAmount;
  const fee = computeFee(amount);
  const idempotencyKey = randomUUID();

  const payment = await prisma.payment.create({
    data: {
      direction: "in",
      contributionId,
      provider: "simulated",
      idempotencyKey,
      operator,
      amount,
      fee,
      status: "initiated",
    },
  });

  await prisma.contribution.update({ where: { id: contributionId }, data: { status: "pending" } });

  const { providerRef } = await simulatedPaymentProvider.initiate({
    paymentId: payment.id,
    amount,
    operator,
    momoNumber,
    direction: "in",
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { providerRef, status: "pending" } });

  return { payment: await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }) };
}

export async function declareCashContribution(contributionId: string, userId: string) {
  const contribution = await prisma.contribution.findUniqueOrThrow({
    where: { id: contributionId },
    include: { membership: true, round: { include: { tontine: { include: { memberships: true } } } } },
  });
  if (contribution.membership.userId !== userId) throw Errors.notAMember();
  if (contribution.status === "paid") throw Errors.contributionAlreadyPaid();

  const amount = contribution.amountDue + contribution.penaltyAmount;
  const payment = await prisma.payment.create({
    data: {
      direction: "in",
      contributionId,
      provider: "cash",
      idempotencyKey: randomUUID(),
      amount,
      fee: 0n,
      status: "pending",
    },
  });

  const approvers = contribution.round.tontine.memberships.filter(
    (m) => m.status === "active" && (m.role === "president" || m.role === "treasurer"),
  );
  await Promise.all(
    approvers.map((a) =>
      notify(
        a.userId,
        "payment_confirmed",
        "Paiement espèces à valider",
        `Un membre a déclaré un paiement espèces de ${amount} FCFA. Validez-le dans l'historique du tour.`,
        { contributionId },
      ),
    ),
  );
  return payment;
}

export async function confirmCashContribution(contributionId: string, actorId: string) {
  const payment = await prisma.payment.findFirst({
    where: { contributionId, provider: "cash", status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) throw Errors.notFound("Paiement espèces en attente");
  await applyPaymentOutcome(payment.id, "succeeded", { confirmedBy: actorId, method: "cash" });
}

/** Point d'entrée unique des webhooks (simulés ou réels) : idempotent via webhook_events (provider, event_id). */
export function wireSimulatedWebhooks() {
  simulatedPaymentProvider.onWebhook(async (event) => {
    const already = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: event.provider, eventId: event.eventId } },
    });
    if (already) return;
    await prisma.webhookEvent.create({
      data: { provider: event.provider, eventId: event.eventId, payload: event.payload as Prisma.InputJsonValue },
    });

    const payment = await prisma.payment.findFirst({ where: { providerRef: event.providerRef } });
    if (!payment) return;
    await applyPaymentOutcome(payment.id, event.status, event.payload as Record<string, unknown>);
    await prisma.webhookEvent.updateMany({
      where: { provider: event.provider, eventId: event.eventId },
      data: { processedAt: new Date() },
    });
  });
}

/** Applique le résultat (succès/échec) d'un paiement entrant ou sortant — appelé par le webhook ou la validation espèces. */
async function applyPaymentOutcome(paymentId: string, status: "succeeded" | "failed", meta: Record<string, unknown> = {}) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status === "succeeded" || payment.status === "failed") return; // déjà traité (idempotence)

  if (payment.direction === "in") {
    await handleContributionPaymentOutcome(payment, status, meta);
  } else {
    await handlePayoutPaymentOutcome(payment, status);
  }
}

async function handleContributionPaymentOutcome(
  payment: Prisma.PaymentGetPayload<Record<string, never>>,
  status: "succeeded" | "failed",
  meta: Record<string, unknown>,
) {
  const contribution = await prisma.contribution.findUniqueOrThrow({
    where: { id: payment.contributionId! },
    include: { membership: { include: { tontine: true } }, round: true },
  });
  const tontineId = contribution.membership.tontine.id;

  if (status === "succeeded") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded" } });
      await tx.contribution.update({
        where: { id: contribution.id },
        data: { status: "paid", amountPaid: payment.amount, paidAt: new Date() },
      });
      // La pénalité de retard est comptabilisée à part de la cotisation (cf. TRD, table des
      // écritures du grand livre : "Pénalité payée" crédite penalties_collected, pas contributions_received).
      const penaltyPortion = contribution.penaltyAmount < payment.amount ? contribution.penaltyAmount : payment.amount;
      const basePortion = payment.amount - penaltyPortion;
      const lines: LedgerLine[] = [{ account: Accounts.providerClearing, debit: payment.amount, reason: "Cotisation confirmée" }];
      if (basePortion > 0n) {
        lines.push({ account: Accounts.contributionsReceived(tontineId), credit: basePortion, reason: "Cotisation confirmée" });
      }
      if (penaltyPortion > 0n) {
        lines.push({ account: Accounts.penaltiesCollected, credit: penaltyPortion, reason: "Pénalité de retard payée" });
      }
      await writeLedgerTransaction(tx, tontineId, lines, { roundId: contribution.roundId, paymentId: payment.id });
      if (payment.fee > 0n) {
        await writeLedgerTransaction(
          tx,
          tontineId,
          [
            { account: Accounts.providerClearing, debit: payment.fee, reason: "Frais opérateur" },
            { account: Accounts.feesCollected, credit: payment.fee, reason: "Frais opérateur" },
          ],
          { roundId: contribution.roundId, paymentId: payment.id },
        );
      }
    });
    await notify(
      contribution.membership.userId,
      "payment_confirmed",
      "Paiement confirmé",
      `Votre cotisation de ${payment.amount} FCFA a bien été reçue. Merci !`,
      { contributionId: contribution.id, method: meta.method ?? "mobile_money" },
    );
    const { checkRoundCompletion } = await import("../rounds/rounds.engine");
    await checkRoundCompletion(contribution.roundId);
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "due" } });
    await notify(
      contribution.membership.userId,
      "payment_failed",
      "Paiement échoué",
      "Votre paiement n'a pas pu être confirmé. Vous pouvez réessayer.",
      { contributionId: contribution.id },
    );
  }
}

/**
 * Déclenche le versement du pot d'un tour (appelé quand le tour est complet).
 * Idempotent : l'écriture "tour complet, pot à verser" ne doit jamais s'écrire deux fois pour le
 * même tour — sinon chaque relance d'un versement en échec la rejouerait en double. On ne l'écrit
 * donc que si le tour n'a pas déjà quitté l'état "complete".
 */
export async function requestPayout(roundId: string) {
  const round = await prisma.round.findUniqueOrThrow({
    where: { id: roundId },
    include: { tontine: true, beneficiary: { include: { user: true } } },
  });

  if (round.status === "complete") {
    await prisma.$transaction(async (tx) => {
      await writeLedgerTransaction(
        tx,
        round.tontineId,
        [
          { account: Accounts.contributionsReceived(round.tontineId), debit: round.potAmount, reason: "Tour complet, pot à verser" },
          { account: Accounts.potPayable(round.tontineId), credit: round.potAmount, reason: "Tour complet, pot à verser" },
        ],
        { roundId: round.id },
      );
      // cf. TRD : machine à états du tour — complete -> payout_pending -> paid_out
      await tx.round.update({ where: { id: round.id }, data: { status: "payout_pending" } });
    });
  }

  const payout = await prisma.payout.upsert({
    where: { roundId },
    update: {},
    create: { roundId, beneficiaryMembershipId: round.beneficiaryMembershipId, amount: round.potAmount, status: "pending" },
  });

  await sendPayout(payout.id);
}

/** Relance l'envoi d'un versement déjà comptabilisé (écran back-office « Tâches en échec »). */
export async function retryPayout(roundId: string) {
  return requestPayout(roundId);
}

async function sendPayout(payoutId: string) {
  const payout = await prisma.payout.findUniqueOrThrow({
    where: { id: payoutId },
    include: { round: true, beneficiary: { include: { user: true } } },
  });
  if (payout.attempts >= 3) return;

  const idempotencyKey = randomUUID();
  const payment = await prisma.payment.create({
    data: { direction: "out", provider: "simulated", idempotencyKey, amount: payout.amount, status: "initiated" },
  });
  await prisma.payout.update({ where: { id: payoutId }, data: { paymentId: payment.id, status: "sent", attempts: payout.attempts + 1 } });

  const { providerRef } = await simulatedPaymentProvider.initiate({
    paymentId: payment.id,
    amount: payout.amount,
    operator: payout.beneficiary.user.momoOperator,
    momoNumber: payout.beneficiary.user.momoNumber,
    direction: "out",
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { providerRef, status: "pending" } });
}

async function handlePayoutPaymentOutcome(payment: Prisma.PaymentGetPayload<Record<string, never>>, status: "succeeded" | "failed") {
  const payout = await prisma.payout.findFirstOrThrow({ where: { paymentId: payment.id }, include: { round: true } });
  const { onPayoutConfirmed, onPayoutFailed } = await import("../rounds/rounds.engine");

  if (status === "succeeded") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded" } });
      await tx.payout.update({ where: { id: payout.id }, data: { status: "confirmed" } });
      await writeLedgerTransaction(
        tx,
        payout.round.tontineId,
        [
          { account: Accounts.potPayable(payout.round.tontineId), debit: payout.amount, reason: "Versement envoyé" },
          { account: Accounts.providerClearing, credit: payout.amount, reason: "Versement envoyé" },
        ],
        { roundId: payout.roundId, paymentId: payment.id },
      );
    });
    await onPayoutConfirmed(payout.roundId);
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    if (payout.attempts < 3) {
      await sendPayout(payout.id);
    } else {
      await prisma.payout.update({ where: { id: payout.id }, data: { status: "failed" } });
      await onPayoutFailed(payout.roundId);
    }
  }
}
