import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";
import { Errors } from "../../common/errors";
import { recordAudit } from "../audit/audit.service";

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAdminAuth);

// Écran B02 — utilisateurs : recherche + détail + suspension (cf. matrice de droits du PRD : admin seul).
adminUsersRouter.get(
  "/",
  h(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const users = await prisma.user.findMany({
      where: q ? { OR: [{ phone: { contains: q } }, { fullName: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { memberships: true } } },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        suspendedAt: u.suspendedAt,
        membershipCount: u._count.memberships,
        createdAt: u.createdAt,
      })),
    );
  }),
);

adminUsersRouter.get(
  "/:id",
  h(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { memberships: { include: { tontine: true } } },
    });
    res.json({
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      momoNumber: user.momoNumber,
      momoOperator: user.momoOperator,
      status: user.status,
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
      createdAt: user.createdAt,
      memberships: user.memberships.map((m) => ({
        tontineId: m.tontineId,
        tontineName: m.tontine.name,
        role: m.role,
        status: m.status,
      })),
    });
  }),
);

const suspendSchema = z.object({ reason: z.string().min(3).max(300) });

adminUsersRouter.post(
  "/:id/suspend",
  h(async (req, res) => {
    const parsed = suspendSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "suspended", suspendedAt: new Date(), suspendedReason: parsed.data.reason },
    });
    await recordAudit(null, null, "admin_user_suspended", { userId: user.id, adminId: req.adminId, reason: parsed.data.reason });
    res.json({ ok: true });
  }),
);

adminUsersRouter.post(
  "/:id/unsuspend",
  h(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "active", suspendedAt: null, suspendedReason: null },
    });
    await recordAudit(null, null, "admin_user_unsuspended", { userId: user.id, adminId: req.adminId });
    res.json({ ok: true });
  }),
);
