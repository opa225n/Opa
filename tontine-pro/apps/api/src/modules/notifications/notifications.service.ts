import type { Prisma } from "@prisma/client";
import { prisma } from "../../common/prisma";

export type NotificationType =
  | "invitation"
  | "new_member"
  | "cycle_started"
  | "round_open"
  | "payment_reminder"
  | "payment_confirmed"
  | "payment_failed"
  | "late"
  | "president_decision"
  | "dispute_resolved"
  | "payout_sent"
  | "payout_received"
  | "payout_failed"
  | "cycle_completed";

// Les canaux réels (push FCFA/FCM, SMS, WhatsApp) sont simulés ici par un log + une ligne "in_app" :
// cf. TRD §notifications et §environnements ("simulateurs" en local/staging).
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data: data as Prisma.InputJsonValue, channel: "in_app" },
  });
  // eslint-disable-next-line no-console
  console.log(`[notify:simulé] -> user=${userId} [${type}] ${title} — ${body}`);
  return notification;
}

export async function notifyMany(userIds: string[], type: NotificationType, title: string, body: string, data: Record<string, unknown> = {}) {
  await Promise.all(userIds.map((id) => notify(id, type, title, body, data)));
}
