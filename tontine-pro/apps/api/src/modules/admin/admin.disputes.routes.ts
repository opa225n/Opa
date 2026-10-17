import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";
import { Errors } from "../../common/errors";
import { recordAudit } from "../audit/audit.service";

export const adminDisputesRouter = Router();
adminDisputesRouter.use(requireAdminAuth);

// Écran B06 — litiges : contexte complet (cf. App Flow P6) pour trancher.
adminDisputesRouter.get(
  "/",
  h(async (req, res) => {
    const status = String(req.query.status || "open").trim();
    const disputes = await prisma.dispute.findMany({
      where: status === "all" ? undefined : { status: status as never },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { tontine: true, raisedBy: true, resolvedBy: true },
    });
    res.json(
      disputes.map((d) => ({
        id: d.id,
        tontineId: d.tontineId,
        tontineName: d.tontine.name,
        raisedByName: d.raisedBy.fullName || d.raisedBy.phone,
        contributionId: d.contributionId,
        reason: d.reason,
        status: d.status,
        resolution: d.resolution,
        resolvedByName: d.resolvedBy?.fullName,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt,
      })),
    );
  }),
);

const resolveSchema = z.object({ resolution: z.string().min(3).max(500), outcome: z.enum(["resolved", "dismissed"]) });

adminDisputesRouter.post(
  "/:id/resolve",
  h(async (req, res) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const dispute = await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.outcome,
        resolution: parsed.data.resolution,
        resolvedByAdminId: req.adminId!,
        resolvedAt: new Date(),
      },
    });
    await recordAudit(dispute.tontineId, null, "admin_dispute_resolved", {
      adminId: req.adminId,
      disputeId: dispute.id,
      outcome: parsed.data.outcome,
    });
    res.json({ ok: true });
  }),
);
