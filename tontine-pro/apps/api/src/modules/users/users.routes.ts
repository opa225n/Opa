import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";
import { Errors } from "../../common/errors";
import { hashSecret } from "../../common/hash";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get(
  "/",
  h(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    res.json({
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      language: user.language,
      momoNumber: user.momoNumber,
      momoOperator: user.momoOperator,
      hasPin: Boolean(user.pinHash),
    });
  }),
);

const patchSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  language: z.enum(["fr", "en"]).optional(),
  momoNumber: z.string().min(8).max(20).optional(),
  momoOperator: z.enum(["orange", "mtn", "moov", "wave"]).optional(),
  pin: z.string().length(4).optional(),
});

usersRouter.patch(
  "/",
  h(async (req, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { pin, ...rest } = parsed.data;
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { ...rest, ...(pin ? { pinHash: hashSecret(pin) } : {}) },
    });
    res.json({
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      language: user.language,
      momoNumber: user.momoNumber,
      momoOperator: user.momoOperator,
      hasPin: Boolean(user.pinHash),
    });
  }),
);

const pinLoginSchema = z.object({ pin: z.string().length(4) });

usersRouter.post(
  "/verify-pin",
  h(async (req, res) => {
    const parsed = pinLoginSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const ok = user.pinHash ? hashSecret(parsed.data.pin) === user.pinHash : false;
    res.json({ valid: ok });
  }),
);
