import { Router } from "express";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";

export const adminDashboardRouter = Router();
adminDashboardRouter.use(requireAdminAuth);

// Écran B01 — tableau de bord : indicateurs clés (cf. PRD §objectifs à 6 mois).
adminDashboardRouter.get(
  "/",
  h(async (_req, res) => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      totalUsers,
      activeTontines,
      draftTontines,
      completedTontines,
      paymentsToday,
      failedPayments,
      failedPayouts,
      openDisputes,
      pendingCorrections,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.tontine.count({ where: { status: "active" } }),
      prisma.tontine.count({ where: { status: "draft" } }),
      prisma.tontine.count({ where: { status: "completed" } }),
      prisma.payment.count({ where: { status: "succeeded", updatedAt: { gte: since24h } } }),
      prisma.payment.count({ where: { status: "failed" } }),
      prisma.payout.count({ where: { status: "failed" } }),
      prisma.dispute.count({ where: { status: "open" } }),
      prisma.ledgerCorrection.count({ where: { status: "pending" } }),
    ]);
    res.json({
      totalUsers,
      activeTontines,
      draftTontines,
      completedTontines,
      paymentsConfirmedLast24h: paymentsToday,
      failedPayments,
      failedPayouts,
      openDisputes,
      pendingLedgerCorrections: pendingCorrections,
    });
  }),
);
