import { Router } from "express";
import { prisma } from "../../common/prisma";
import { h } from "../../common/asyncHandler";
import { requireAuth } from "../../common/auth";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/",
  h(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  }),
);

notificationsRouter.post(
  "/:id/read",
  h(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

notificationsRouter.post(
  "/read-all",
  h(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.userId!, readAt: null }, data: { readAt: new Date() } });
    res.json({ ok: true });
  }),
);
