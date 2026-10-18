import { Router } from "express";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";
import { Errors } from "../../common/errors";
import { recordAudit } from "../audit/audit.service";

export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(requireAdminAuth);

// Écran B04 — paiements : liste filtrable par statut/direction/fournisseur.
adminPaymentsRouter.get(
  "/",
  h(async (req, res) => {
    const status = String(req.query.status || "").trim();
    const direction = String(req.query.direction || "").trim();
    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(direction ? { direction: direction as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { contribution: { include: { membership: { include: { user: true, tontine: true } } } } },
    });
    res.json(
      payments.map((p) => ({
        id: p.id,
        direction: p.direction,
        status: p.status,
        provider: p.provider,
        providerRef: p.providerRef,
        operator: p.operator,
        amount: p.amount,
        fee: p.fee,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        memberName: p.contribution?.membership.user.fullName || p.contribution?.membership.user.phone || null,
        tontineName: p.contribution?.membership.tontine.name || null,
      })),
    );
  }),
);

// Écran B07 — tâches en échec : paiements et versements qui n'ont pas abouti, avec relance pour les versements.
adminPaymentsRouter.get(
  "/failed-tasks",
  h(async (_req, res) => {
    const [failedPayments, failedPayouts] = await Promise.all([
      prisma.payment.findMany({
        // Seuls les paiements entrants (cotisations) : les tentatives de versement échouées sont
        // déjà listées ci-dessous via la table payouts, avec leur nombre total de tentatives.
        where: { status: "failed", direction: "in" },
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: { contribution: { include: { membership: { include: { user: true, tontine: true } } } } },
      }),
      prisma.payout.findMany({
        where: { status: "failed" },
        orderBy: { id: "desc" },
        take: 100,
        include: { round: { include: { tontine: true } }, beneficiary: { include: { user: true } } },
      }),
    ]);
    res.json({
      failedPayments: failedPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        updatedAt: p.updatedAt,
        memberName: p.contribution?.membership.user.fullName || p.contribution?.membership.user.phone,
        tontineName: p.contribution?.membership.tontine.name,
      })),
      failedPayouts: failedPayouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        attempts: p.attempts,
        beneficiaryName: p.beneficiary.user.fullName || p.beneficiary.user.phone,
        tontineName: p.round.tontine.name,
        roundNumber: p.round.roundNumber,
      })),
    });
  }),
);

adminPaymentsRouter.post(
  "/payouts/:id/retry",
  h(async (req, res) => {
    const payout = await prisma.payout.findUniqueOrThrow({ where: { id: req.params.id } });
    if (payout.status !== "failed") throw Errors.conflict("PAYOUT_NOT_FAILED", "Ce versement n'est pas en échec.");
    await prisma.payout.update({ where: { id: payout.id }, data: { status: "pending", attempts: 0 } });
    const { retryPayout } = await import("../payments/payments.service");
    await retryPayout(payout.roundId);
    await recordAudit(null, null, "admin_payout_retried", { adminId: req.adminId, payoutId: payout.id });
    res.json({ ok: true });
  }),
);

// Écran B05 — rapprochement : solde par compte du grand livre, globalement et par jour (provider_clearing
// doit revenir à zéro une fois les versements effectués, cf. TRD).
adminPaymentsRouter.get(
  "/reconciliation",
  h(async (_req, res) => {
    const byAccount = await prisma.$queryRaw<
      { account: string; debit: bigint; credit: bigint }[]
    >`SELECT account, COALESCE(SUM(debit),0) as debit, COALESCE(SUM(credit),0) as credit
      FROM ledger_entries GROUP BY account ORDER BY account`;

    const byDay = await prisma.$queryRaw<
      { day: Date; debit: bigint; credit: bigint }[]
    >`SELECT date_trunc('day', created_at) as day, COALESCE(SUM(debit),0) as debit, COALESCE(SUM(credit),0) as credit
      FROM ledger_entries WHERE account = 'provider_clearing' GROUP BY day ORDER BY day DESC LIMIT 30`;

    res.json({
      byAccount: byAccount.map((a) => ({ account: a.account, debit: Number(a.debit), credit: Number(a.credit), balance: Number(a.debit) - Number(a.credit) })),
      providerClearingByDay: byDay.map((d) => ({ day: d.day, debit: Number(d.debit), credit: Number(d.credit), balance: Number(d.debit) - Number(d.credit) })),
    });
  }),
);
