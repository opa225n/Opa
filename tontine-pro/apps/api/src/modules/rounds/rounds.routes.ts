import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { requireMembership, requirePresident, maskPhone } from "../../common/membership";
import { Errors } from "../../common/errors";
import { closeRoundWithAbsentees, checkRoundCompletion } from "./rounds.engine";
import { recordAudit } from "../audit/audit.service";
import { notify } from "../notifications/notifications.service";

export const tontineRoundsRouter = Router({ mergeParams: true });
tontineRoundsRouter.use(requireAuth);

tontineRoundsRouter.get(
  "/",
  h(async (req, res) => {
    await requireMembership(req.params.id, req.userId!);
    const rounds = await prisma.round.findMany({
      where: { tontineId: req.params.id },
      orderBy: { roundNumber: "asc" },
      include: { beneficiary: { include: { user: true } } },
    });
    res.json(
      rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        dueDate: r.dueDate,
        potAmount: r.potAmount,
        status: r.status,
        beneficiaryName: r.beneficiary.user.fullName || maskPhone(r.beneficiary.user.phone),
        beneficiaryMembershipId: r.beneficiaryMembershipId,
      })),
    );
  }),
);

export const roundsRouter = Router();
roundsRouter.use(requireAuth);

roundsRouter.get(
  "/:roundId/contributions",
  h(async (req, res) => {
    const round = await prisma.round.findUniqueOrThrow({ where: { id: req.params.roundId } });
    const membership = await requireMembership(round.tontineId, req.userId!);
    const contributions = await prisma.contribution.findMany({
      where: { roundId: round.id },
      include: { membership: { include: { user: true } } },
      orderBy: { id: "asc" },
    });
    res.json({
      round: { id: round.id, roundNumber: round.roundNumber, status: round.status, dueDate: round.dueDate, potAmount: round.potAmount },
      viewerRole: membership.role,
      contributions: contributions.map((c) => ({
        id: c.id,
        membershipId: c.membershipId,
        memberName: c.membership.user.fullName || maskPhone(c.membership.user.phone),
        isSelf: c.membership.userId === req.userId,
        amountDue: c.amountDue,
        penaltyAmount: c.penaltyAmount,
        status: c.status,
        paidAt: c.paidAt,
      })),
    });
  }),
);

const decisionSchema = z.object({
  action: z.enum(["grant_delay", "waive_penalty", "keep_penalty", "close_without_member"]),
  contributionId: z.string().optional(),
  reason: z.string().min(3).max(300).optional(),
  extraHours: z.number().int().min(1).max(168).optional(),
});

roundsRouter.post(
  "/:roundId/decisions",
  h(async (req, res) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const round = await prisma.round.findUniqueOrThrow({ where: { id: req.params.roundId } });
    await requirePresident(round.tontineId, req.userId!);
    const { action, contributionId, reason, extraHours } = parsed.data;

    if (action === "close_without_member") {
      if (!reason) throw Errors.validation("Un motif est requis pour clôturer sans un membre.");
      await closeRoundWithAbsentees(round.id, req.userId!);
      await recordAudit(round.tontineId, req.userId!, "president_decision_close_without_member", { reason });
      return res.json({ ok: true });
    }

    if (!contributionId) throw Errors.validation("contributionId requis pour cette décision.");
    const contribution = await prisma.contribution.findUniqueOrThrow({
      where: { id: contributionId },
      include: { membership: true },
    });

    if (action === "waive_penalty") {
      if (!reason) throw Errors.validation("Un motif est requis pour annuler une pénalité.");
      await prisma.contribution.update({ where: { id: contributionId }, data: { status: "waived", penaltyAmount: 0n } });
      await notify(contribution.membership.userId, "president_decision", "Pénalité annulée", `Le président a annulé votre pénalité. Motif : ${reason}`);
    } else if (action === "keep_penalty") {
      await notify(contribution.membership.userId, "president_decision", "Pénalité maintenue", "Le président a maintenu la pénalité de retard.");
    } else if (action === "grant_delay") {
      const hours = extraHours ?? 24;
      await notify(
        contribution.membership.userId,
        "president_decision",
        "Délai accordé",
        `Le président vous accorde ${hours}h supplémentaires pour cotiser.`,
      );
    }
    await recordAudit(round.tontineId, req.userId!, `president_decision_${action}`, { contributionId, reason });
    await checkRoundCompletion(round.id);
    res.json({ ok: true });
  }),
);
