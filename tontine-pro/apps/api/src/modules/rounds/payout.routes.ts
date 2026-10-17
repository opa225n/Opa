import { Router } from "express";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { requireMembership, maskPhone } from "../../common/membership";

export const payoutRouter = Router();
payoutRouter.use(requireAuth);

payoutRouter.get(
  "/:roundId",
  h(async (req, res) => {
    const round = await prisma.round.findUniqueOrThrow({
      where: { id: req.params.roundId },
      include: { beneficiary: { include: { user: true } }, payout: { include: { payment: true } } },
    });
    const membership = await requireMembership(round.tontineId, req.userId!);
    const isBeneficiary = round.beneficiary.userId === req.userId;
    const isAdminView = membership.role === "president";

    res.json({
      roundId: round.id,
      roundNumber: round.roundNumber,
      amount: round.potAmount,
      status: round.payout?.status ?? "pending",
      beneficiaryName: round.beneficiary.user.fullName || maskPhone(round.beneficiary.user.phone),
      isBeneficiary,
      // Le numéro complet n'est jamais visible, sauf au titulaire (cf. UI/UX §accessibilité / rôles).
      beneficiaryMomoNumber: isBeneficiary ? round.beneficiary.user.momoNumber : maskPhone(round.beneficiary.user.momoNumber ?? ""),
      reference: isBeneficiary || isAdminView ? round.payout?.payment?.providerRef ?? null : null,
      attempts: round.payout?.attempts ?? 0,
    });
  }),
);
