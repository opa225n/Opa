import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { Errors } from "../../common/errors";
import { hashSecret, secretMatches } from "../../common/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../common/auth";
import { sendSms } from "../../providers/sms/simulated";

export const authRouter = Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_PER_HOUR = 5; // assoupli par rapport au PRD (3/h) pour fluidifier les tests de la démo
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;

function randomOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const requestSchema = z.object({ phone: z.string().min(8).max(20) });

authRouter.post(
  "/otp/request",
  h(async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { phone } = parsed.data;

    const since1h = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.otpCode.findMany({
      where: { phone, createdAt: { gte: since1h } },
      orderBy: { createdAt: "desc" },
    });
    if (recent.length > 0) {
      const last = recent[0];
      if (Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
        throw Errors.rateLimited();
      }
    }
    if (recent.length >= OTP_MAX_PER_HOUR) throw Errors.rateLimited();

    const code = randomOtp();
    await prisma.otpCode.create({
      data: { phone, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await sendSms(phone, `Votre code Tontine : ${code} (valable 5 min)`);

    res.json({
      sent: true,
      expiresInSeconds: OTP_TTL_MS / 1000,
      // Dev uniquement : évite de brancher un vrai SMS pour tester le parcours. Jamais en production.
      devCode: process.env.OTP_DEV_ECHO === "true" ? code : undefined,
    });
  }),
);

const verifySchema = z.object({ phone: z.string().min(8).max(20), code: z.string().length(6) });

authRouter.post(
  "/otp/verify",
  h(async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { phone, code } = parsed.data;

    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumed: false },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw Errors.invalidOtp();
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      const lockedUntil = otp.createdAt.getTime() + OTP_LOCK_MS;
      if (Date.now() < lockedUntil) throw Errors.otpLocked();
    }
    if (otp.expiresAt.getTime() < Date.now()) throw Errors.otpExpired();

    if (!secretMatches(code, otp.codeHash)) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
      throw Errors.invalidOtp();
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;
    if (!user) {
      user = await prisma.user.create({ data: { phone, fullName: "" } });
      isNewUser = true;
    }

    res.json({
      isNewUser,
      profileComplete: Boolean(user.fullName && user.momoNumber && user.pinHash),
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id),
      user: { id: user.id, phone: user.phone, fullName: user.fullName },
    });
  }),
);

const refreshSchema = z.object({ refreshToken: z.string() });

authRouter.post(
  "/refresh",
  h(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    try {
      const payload = verifyRefreshToken(parsed.data.refreshToken);
      res.json({ accessToken: signAccessToken(payload.sub) });
    } catch {
      throw Errors.unauthorized();
    }
  }),
);
