import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { requireMembership } from "../../common/membership";
import { Errors } from "../../common/errors";

// Côté membre : "Aide et signalement" (écran E42) — remonte un litige traité au back-office (B06).
export const disputesRouter = Router({ mergeParams: true });
disputesRouter.use(requireAuth);

const createSchema = z.object({ reason: z.string().min(5).max(500), contributionId: z.string().optional() });

disputesRouter.post(
  "/",
  h(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    await requireMembership(req.params.id, req.userId!);
    const dispute = await prisma.dispute.create({
      data: {
        tontineId: req.params.id,
        raisedByUserId: req.userId!,
        contributionId: parsed.data.contributionId,
        reason: parsed.data.reason,
      },
    });
    res.status(201).json({ id: dispute.id, status: dispute.status });
  }),
);

disputesRouter.get(
  "/",
  h(async (req, res) => {
    await requireMembership(req.params.id, req.userId!);
    const disputes = await prisma.dispute.findMany({
      where: { tontineId: req.params.id, raisedByUserId: req.userId! },
      orderBy: { createdAt: "desc" },
    });
    res.json(disputes);
  }),
);
