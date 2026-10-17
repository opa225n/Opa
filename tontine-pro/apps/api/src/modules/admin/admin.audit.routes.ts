import { Router } from "express";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAdminAuth } from "../../common/adminAuth";

// Écran B08 — journal admin : toutes les actions journalisées (acteurs membres + actions admin).
export const adminAuditRouter = Router();
adminAuditRouter.use(requireAdminAuth);

adminAuditRouter.get(
  "/",
  h(async (req, res) => {
    const tontineId = String(req.query.tontineId || "").trim();
    const entries = await prisma.auditLog.findMany({
      where: tontineId ? { tontineId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { tontine: true, actor: true },
    });
    res.json(
      entries.map((e) => ({
        id: e.id,
        action: e.action,
        details: e.details,
        tontineName: e.tontine?.name,
        actorName: e.actor?.fullName || e.actor?.phone,
        createdAt: e.createdAt,
      })),
    );
  }),
);
