import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";
import { Errors } from "../../common/errors";
import { writeLedgerTransaction } from "../ledger/ledger.service";
import { recordAudit } from "../audit/audit.service";

// Corriger une écriture du grand livre nécessite l'admin proposant + un SECOND admin pour approuver
// (cf. PRD, matrice de droits : "Corriger une écriture du grand livre — Admin (+2e admin)").
// Les écritures existantes ne sont jamais modifiées : une correction approuvée écrit l'inverse
// de la transaction d'origine, puis la transaction corrigée — toutes deux équilibrées.
export const adminLedgerCorrectionsRouter = Router();
adminLedgerCorrectionsRouter.use(requireAdminAuth);

const lineSchema = z.object({ account: z.string().min(1), debit: z.number().int().min(0).default(0), credit: z.number().int().min(0).default(0), reason: z.string().min(1) });
const proposeSchema = z.object({
  tontineId: z.string(),
  originalTxId: z.string(),
  reason: z.string().min(5).max(500),
  correctedLines: z.array(lineSchema).min(1),
});

adminLedgerCorrectionsRouter.get(
  "/",
  h(async (req, res) => {
    const status = String(req.query.status || "").trim();
    const corrections = await prisma.ledgerCorrection.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { tontine: true, proposedBy: true, approvedBy: true },
    });
    res.json(
      corrections.map((c) => ({
        id: c.id,
        tontineName: c.tontine.name,
        originalTxId: c.originalTxId,
        reason: c.reason,
        correctedLines: c.correctedLines,
        status: c.status,
        proposedByName: c.proposedBy.fullName,
        approvedByName: c.approvedBy?.fullName,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt,
      })),
    );
  }),
);

adminLedgerCorrectionsRouter.post(
  "/",
  h(async (req, res) => {
    const parsed = proposeSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { correctedLines, ...rest } = parsed.data;
    const totalDebit = correctedLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = correctedLines.reduce((s, l) => s + l.credit, 0);
    if (totalDebit !== totalCredit) throw Errors.validation("Les lignes corrigées doivent être équilibrées (débit = crédit).");

    const original = await prisma.ledgerEntry.findMany({ where: { txId: rest.originalTxId } });
    if (original.length === 0) throw Errors.notFound("Transaction du grand livre à corriger");

    const correction = await prisma.ledgerCorrection.create({
      data: { ...rest, correctedLines: correctedLines as unknown as Prisma.InputJsonValue, proposedByAdminId: req.adminId! },
    });
    await recordAudit(rest.tontineId, null, "admin_ledger_correction_proposed", { adminId: req.adminId, correctionId: correction.id });
    res.status(201).json({ id: correction.id, status: correction.status });
  }),
);

adminLedgerCorrectionsRouter.post(
  "/:id/approve",
  h(async (req, res) => {
    const correction = await prisma.ledgerCorrection.findUniqueOrThrow({ where: { id: req.params.id } });
    if (correction.status !== "pending") throw Errors.conflict("CORRECTION_NOT_PENDING", "Cette correction a déjà été traitée.");
    if (correction.proposedByAdminId === req.adminId) {
      throw Errors.forbidden("Un second administrateur, différent de celui qui a proposé la correction, doit l'approuver.");
    }

    const originalLines = await prisma.ledgerEntry.findMany({ where: { txId: correction.originalTxId } });
    const correctedLines = correction.correctedLines as { account: string; debit: number; credit: number; reason: string }[];

    await prisma.$transaction(async (tx) => {
      // 1) Annule l'écriture d'origine (inverse chaque ligne).
      await writeLedgerTransaction(
        tx,
        correction.tontineId,
        originalLines.map((l) => ({
          account: l.account,
          debit: l.credit,
          credit: l.debit,
          reason: `Correction (annulation) : ${correction.reason}`,
        })),
      );
      // 2) Écrit la version corrigée.
      await writeLedgerTransaction(
        tx,
        correction.tontineId,
        correctedLines.map((l) => ({ account: l.account, debit: BigInt(l.debit), credit: BigInt(l.credit), reason: l.reason })),
      );
      await tx.ledgerCorrection.update({
        where: { id: correction.id },
        data: { status: "approved", approvedByAdminId: req.adminId!, resolvedAt: new Date() },
      });
    });

    await recordAudit(correction.tontineId, null, "admin_ledger_correction_approved", { adminId: req.adminId, correctionId: correction.id });
    res.json({ ok: true });
  }),
);

adminLedgerCorrectionsRouter.post(
  "/:id/reject",
  h(async (req, res) => {
    const correction = await prisma.ledgerCorrection.findUniqueOrThrow({ where: { id: req.params.id } });
    if (correction.status !== "pending") throw Errors.conflict("CORRECTION_NOT_PENDING", "Cette correction a déjà été traitée.");
    await prisma.ledgerCorrection.update({
      where: { id: correction.id },
      data: { status: "rejected", approvedByAdminId: req.adminId!, resolvedAt: new Date() },
    });
    await recordAudit(correction.tontineId, null, "admin_ledger_correction_rejected", { adminId: req.adminId, correctionId: correction.id });
    res.json({ ok: true });
  }),
);
