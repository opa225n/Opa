import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { Errors } from "../../common/errors";
import { hashSecret, secretMatches } from "../../common/hash";
import { signAdminToken, requireAdminAuth } from "../../common/adminAuth";

export const adminAuthRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

adminAuthRouter.post(
  "/login",
  h(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { email, password } = parsed.data;
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !secretMatches(password, admin.passwordHash)) throw Errors.unauthorized();
    res.json({
      accessToken: signAdminToken(admin.id, admin.role),
      admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role },
    });
  }),
);

adminAuthRouter.get(
  "/me",
  requireAdminAuth,
  h(async (req, res) => {
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: req.adminId! } });
    res.json({ id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role });
  }),
);

// Utilitaire de hachage exposé pour le script de seed (création du premier compte admin).
export { hashSecret as hashAdminPassword };
