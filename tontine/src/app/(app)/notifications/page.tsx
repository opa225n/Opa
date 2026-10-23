import { CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/actions/notifications";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Notifications</h1>
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="outline" size="sm">
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 py-4">
          {notifications.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500">Aucune notification pour le moment.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
                n.readAt
                  ? "border-stone-100 bg-white"
                  : "border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/5"
              }`}
            >
              <div>
                <CardTitle className="text-sm">{n.title}</CardTitle>
                <p className="mt-1 text-sm text-stone-600">{n.body}</p>
                {n.deliveryError && (
                  <p className="mt-1 text-xs text-amber-600">
                    Canal {n.channel} indisponible : {n.deliveryError}
                  </p>
                )}
                <p className="mt-1 text-xs text-stone-400">
                  {n.createdAt.toLocaleString("fr-FR")}
                </p>
              </div>
              {!n.readAt && (
                <form
                  action={async () => {
                    "use server";
                    await markNotificationReadAction(n.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Marquer comme lu
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
