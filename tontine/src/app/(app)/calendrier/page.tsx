import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";

export default async function GlobalCalendarPage() {
  const user = await requireUser();

  const memberships = await prisma.tontineMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true, tontineId: true },
  });
  const membershipIds = memberships.map((m) => m.id);

  const contributions = await prisma.contribution.findMany({
    where: { membershipId: { in: membershipIds } },
    include: { tontine: true, cycle: true },
    orderBy: { cycle: { periodDue: "asc" } },
    take: 50,
  });

  const groups = new Map<string, typeof contributions>();
  for (const c of contributions) {
    const key = c.cycle.periodDue.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Calendrier</h1>
        <p className="text-sm text-stone-500">Vos prochaines cotisations, toutes tontines confondues.</p>
      </div>

      {contributions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-stone-500">
            Aucune cotisation à venir pour le moment.
          </CardContent>
        </Card>
      )}

      {[...groups.entries()].map(([date, items]) => (
        <div key={date} className="flex flex-col gap-2">
          <p className="text-sm font-medium capitalize text-stone-500">{date}</p>
          <div className="flex flex-col gap-2">
            {items.map((c) => {
              const totalDue = c.amountExpectedXof + c.penaltyXof;
              const remaining = Math.max(totalDue - c.amountConfirmedXof, 0);
              const isPaid = remaining === 0;
              return (
                <Link
                  key={c.id}
                  href={`/tontines/${c.tontineId}/cotisations?cycle=${c.cycle.periodIndex}`}
                >
                  <Card accent={!isPaid}>
                    <CardContent className="flex items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-medium text-stone-900">{c.tontine.name}</p>
                        <p className="text-xs text-stone-500">Tour {c.cycle.periodIndex}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isPaid ? "default" : "warning"}>
                          {isPaid ? "Payé" : "En attente"}
                        </Badge>
                        <span className="text-sm font-medium text-stone-700">
                          {formatXof(isPaid ? totalDue : remaining)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
