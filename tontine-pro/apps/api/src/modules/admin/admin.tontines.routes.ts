import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";
import { Errors } from "../../common/errors";
import { recordAudit } from "../audit/audit.service";

export const adminTontinesRouter = Router();
adminTontinesRouter.use(requireAdminAuth);

// Écran B03 — tontines : recherche/filtre par statut, détail, suspension.
adminTontinesRouter.get(
  "/",
  h(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim();
    const tontines = await prisma.tontine.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { memberships: true } }, creator: true },
    });
    res.json(
      tontines.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        suspendedAt: t.suspendedAt,
        memberCount: t._count.memberships,
        contributionAmount: t.contributionAmount,
        frequency: t.frequency,
        createdBy: t.creator.fullName || t.creator.phone,
        createdAt: t.createdAt,
      })),
    );
  }),
);

adminTontinesRouter.get(
  "/:id",
  h(async (req, res) => {
    const tontine = await prisma.tontine.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        memberships: { include: { user: true } },
        rounds: { orderBy: { roundNumber: "asc" } },
        creator: true,
      },
    });
    const ledgerBalance = await prisma.ledgerEntry.groupBy({
      by: ["account"],
      where: { tontineId: tontine.id },
      _sum: { debit: true, credit: true },
    });
    res.json({
      id: tontine.id,
      name: tontine.name,
      description: tontine.description,
      status: tontine.status,
      suspendedAt: tontine.suspendedAt,
      suspendedReason: tontine.suspendedReason,
      contributionAmount: tontine.contributionAmount,
      frequency: tontine.frequency,
      createdBy: tontine.creator.fullName || tontine.creator.phone,
      createdAt: tontine.createdAt,
      members: tontine.memberships.map((m) => ({
        id: m.id,
        name: m.user.fullName || m.user.phone,
        phone: m.user.phone,
        role: m.role,
        status: m.status,
      })),
      rounds: tontine.rounds.map((r) => ({ roundNumber: r.roundNumber, status: r.status, dueDate: r.dueDate, potAmount: r.potAmount })),
      ledgerBalance: ledgerBalance.map((l) => ({
        account: l.account,
        debit: l._sum.debit ?? 0,
        credit: l._sum.credit ?? 0,
        balance: (l._sum.debit ?? 0n) - (l._sum.credit ?? 0n),
      })),
    });
  }),
);

// Liste les transactions du grand livre d'une tontine (groupées par tx_id), pour trouver celle à
// corriger — alimente l'écran de correction du grand livre.
adminTontinesRouter.get(
  "/:id/ledger-transactions",
  h(async (req, res) => {
    const entries = await prisma.ledgerEntry.findMany({
      where: { tontineId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    const byTx = new Map<string, typeof entries>();
    for (const e of entries) {
      if (!byTx.has(e.txId)) byTx.set(e.txId, []);
      byTx.get(e.txId)!.push(e);
    }
    const transactions = [...byTx.entries()].map(([txId, lines]) => ({
      txId,
      createdAt: lines[0].createdAt,
      reason: lines[0].reason,
      lines: lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit })),
    }));
    res.json(transactions);
  }),
);

const suspendSchema = z.object({ reason: z.string().min(3).max(300) });

adminTontinesRouter.post(
  "/:id/suspend",
  h(async (req, res) => {
    const parsed = suspendSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    await prisma.tontine.update({
      where: { id: req.params.id },
      data: { suspendedAt: new Date(), suspendedReason: parsed.data.reason },
    });
    await recordAudit(req.params.id, null, "admin_tontine_suspended", { adminId: req.adminId, reason: parsed.data.reason });
    res.json({ ok: true });
  }),
);

adminTontinesRouter.post(
  "/:id/unsuspend",
  h(async (req, res) => {
    await prisma.tontine.update({ where: { id: req.params.id }, data: { suspendedAt: null, suspendedReason: null } });
    await recordAudit(req.params.id, null, "admin_tontine_unsuspended", { adminId: req.adminId });
    res.json({ ok: true });
  }),
);
