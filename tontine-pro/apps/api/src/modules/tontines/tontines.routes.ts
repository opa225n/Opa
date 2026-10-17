import { Router } from "express";
import { z } from "zod";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { Errors } from "../../common/errors";
import {
  acceptInvitation,
  createInvitation,
  createTontine,
  getTontineDetail,
  listMyTontines,
  previewInvitation,
  setRotationOrder,
  startCycle,
} from "./tontines.service";

export const tontinesRouter = Router();
tontinesRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  contributionAmount: z.number().int().positive(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  startDate: z.string(),
  maxMembers: z.number().int().min(3).max(50),
  gracePeriodHours: z.number().int().min(0).max(240).optional(),
  penaltyType: z.enum(["fixed", "percent"]).optional(),
  penaltyValue: z.number().min(0).optional(),
  solidarityFeePct: z.number().min(0).max(20).optional(),
});

tontinesRouter.post(
  "/",
  h(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const tontine = await createTontine(req.userId!, parsed.data);
    res.status(201).json(tontine);
  }),
);

tontinesRouter.get(
  "/",
  h(async (req, res) => {
    res.json(await listMyTontines(req.userId!));
  }),
);

tontinesRouter.get(
  "/:id",
  h(async (req, res) => {
    res.json(await getTontineDetail(req.params.id, req.userId!));
  }),
);

tontinesRouter.post(
  "/:id/invitations",
  h(async (req, res) => {
    const invitation = await createInvitation(req.params.id, req.userId!, req.body?.phone);
    res.status(201).json(invitation);
  }),
);

const rotationSchema = z.object({ mode: z.enum(["lottery", "manual"]), order: z.array(z.string()).optional() });

tontinesRouter.post(
  "/:id/rotation-order",
  h(async (req, res) => {
    const parsed = rotationSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const members = await setRotationOrder(req.params.id, req.userId!, parsed.data.mode, parsed.data.order);
    res.json(members);
  }),
);

tontinesRouter.post(
  "/:id/start",
  h(async (req, res) => {
    res.json(await startCycle(req.params.id, req.userId!));
  }),
);

export const invitationsRouter = Router();
invitationsRouter.get(
  "/:token",
  h(async (req, res) => {
    const invitation = await previewInvitation(req.params.token);
    res.json({
      tontineName: invitation.tontine.name,
      description: invitation.tontine.description,
      contributionAmount: invitation.tontine.contributionAmount,
      frequency: invitation.tontine.frequency,
      memberCount: invitation.tontine.memberships.length,
      maxMembers: invitation.tontine.maxMembers,
    });
  }),
);
invitationsRouter.use(requireAuth);
invitationsRouter.post(
  "/:token/accept",
  h(async (req, res) => {
    const { tontine, membership } = await acceptInvitation(req.params.token, req.userId!);
    res.json({ tontineId: tontine.id, membershipId: membership.id });
  }),
);
