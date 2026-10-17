import { Router } from "express";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { requireMembership, maskPhone } from "../../common/membership";

export const historyRouter = Router({ mergeParams: true });
historyRouter.use(requireAuth);

historyRouter.get(
  "/",
  h(async (req, res) => {
    await requireMembership(req.params.id, req.userId!);

    const [contributions, payouts, audits] = await Promise.all([
      prisma.contribution.findMany({
        where: { round: { tontineId: req.params.id }, status: { in: ["paid", "waived"] } },
        include: { membership: { include: { user: true } }, round: true },
      }),
      prisma.payout.findMany({
        where: { round: { tontineId: req.params.id }, status: "confirmed" },
        include: { round: true, beneficiary: { include: { user: true } } },
      }),
      prisma.auditLog.findMany({ where: { tontineId: req.params.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);

    const events = [
      ...contributions.map((c) => ({
        type: "contribution" as const,
        date: c.paidAt,
        label: `${c.membership.user.fullName || maskPhone(c.membership.user.phone)} — Tour ${c.round.roundNumber}`,
        amount: c.amountDue + c.penaltyAmount,
        status: c.status,
      })),
      ...payouts.map((p) => ({
        type: "payout" as const,
        date: p.round.closedAt,
        label: `Versement — Tour ${p.round.roundNumber} à ${p.beneficiary.user.fullName || maskPhone(p.beneficiary.user.phone)}`,
        amount: p.amount,
        status: p.status,
      })),
    ].sort((a, b) => ((b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)));

    res.json({
      events,
      audit: audits.map((a) => ({ action: a.action, details: a.details, createdAt: a.createdAt })),
    });
  }),
);

historyRouter.get(
  "/export.csv",
  h(async (req, res) => {
    await requireMembership(req.params.id, req.userId!);
    const contributions = await prisma.contribution.findMany({
      where: { round: { tontineId: req.params.id }, status: { in: ["paid", "waived"] } },
      include: { membership: { include: { user: true } }, round: true },
      orderBy: { round: { roundNumber: "asc" } },
    });
    const rows = [
      ["Tour", "Membre", "Montant", "Pénalité", "Statut", "Date"],
      ...contributions.map((c) => [
        String(c.round.roundNumber),
        c.membership.user.fullName || c.membership.user.phone,
        String(c.amountDue),
        String(c.penaltyAmount),
        c.status,
        c.paidAt ? c.paidAt.toISOString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=historique.csv");
    res.send(csv);
  }),
);
