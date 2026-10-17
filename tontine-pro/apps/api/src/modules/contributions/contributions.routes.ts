import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { Errors } from "../../common/errors";
import { requireTreasurerOrPresident } from "../../common/membership";
import {
  computeFee,
  confirmCashContribution,
  declareCashContribution,
  initiateContributionPayment,
} from "../payments/payments.service";

export const contributionsRouter = Router();
contributionsRouter.use(requireAuth);

const paySchema = z.object({
  operator: z.enum(["orange", "mtn", "moov", "wave"]),
  momoNumber: z.string().min(8).max(20),
});

contributionsRouter.post(
  "/:id/pay",
  h(async (req, res) => {
    const parsed = paySchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { payment } = await initiateContributionPayment(req.params.id, req.userId!, parsed.data.operator, parsed.data.momoNumber);
    res.status(201).json(payment);
  }),
);

contributionsRouter.post(
  "/:id/declare-cash",
  h(async (req, res) => {
    const payment = await declareCashContribution(req.params.id, req.userId!);
    res.status(201).json(payment);
  }),
);

contributionsRouter.post(
  "/:id/confirm-cash",
  h(async (req, res) => {
    const contribution = await prisma.contribution.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { membership: true },
    });
    await requireTreasurerOrPresident(contribution.membership.tontineId, req.userId!);
    await confirmCashContribution(req.params.id, req.userId!);
    res.json({ ok: true });
  }),
);

contributionsRouter.get(
  "/:id/receipt",
  h(async (req, res) => {
    const contribution = await prisma.contribution.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        membership: { include: { user: true, tontine: true } },
        round: true,
        payments: { where: { status: "succeeded" }, orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    if (contribution.membership.userId !== req.userId) throw Errors.notAMember();
    if (contribution.status !== "paid") throw Errors.notFound("Reçu");
    const payment = contribution.payments[0];
    res.json({
      tontineName: contribution.membership.tontine.name,
      memberName: contribution.membership.user.fullName,
      roundNumber: contribution.round.roundNumber,
      amountDue: contribution.amountDue,
      penaltyAmount: contribution.penaltyAmount,
      fee: payment?.fee ?? 0,
      total: contribution.amountDue + contribution.penaltyAmount,
      paidAt: contribution.paidAt,
      reference: payment?.providerRef ?? payment?.id ?? contribution.id,
      method: payment?.provider === "cash" ? "Espèces" : "Mobile Money",
    });
  }),
);

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.get(
  "/:id",
  h(async (req, res) => {
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { contribution: { include: { membership: true } } },
    });
    if (payment.contribution && payment.contribution.membership.userId !== req.userId) throw Errors.notAMember();
    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      fee: payment.fee,
      operator: payment.operator,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  }),
);

export function computeFeePreview(amount: number) {
  return Number(computeFee(BigInt(amount)));
}
