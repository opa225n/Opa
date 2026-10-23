import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { CYCLE_STATUS_LABELS, PAYOUT_STATUS_LABELS } from "@/lib/labels";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { id } = await params;
  const { tontine } = await getTontineContext(id);
  const { group: groupParam } = await searchParams;

  if (tontine.status === "DRAFT") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-stone-500">
          Le calendrier des tours sera généré automatiquement au démarrage de la tontine.
        </CardContent>
      </Card>
    );
  }

  const groups = await prisma.tontineGroup.findMany({
    where: { tontineId: id },
    orderBy: { displayOrder: "asc" },
  });
  const selectedGroupId = groups.length === 0 ? undefined : (groupParam ?? groups[0].id);

  const cycles = await prisma.tontineCycle.findMany({
    where: { tontineId: id, groupId: groups.length > 0 ? selectedGroupId : undefined },
    include: {
      beneficiaryOrder: { include: { membership: { include: { user: true } } } },
      payout: true,
      contributions: true,
    },
    orderBy: { periodIndex: "asc" },
  });

  return (
    <div className="flex flex-col gap-3">
      {groups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {groups.map((g) => (
            <a
              key={g.id}
              href={`?group=${g.id}`}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                selectedGroupId === g.id
                  ? "bg-[var(--brand)] text-[var(--background)]"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {g.name}
            </a>
          ))}
        </div>
      )}
      {cycles.map((cycle) => {
        const confirmed = cycle.contributions.reduce((s, c) => s + c.amountConfirmedXof, 0);
        const expected = cycle.contributions.reduce((s, c) => s + c.amountExpectedXof, 0);
        return (
          <Card key={cycle.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-gold)]/20 text-sm font-bold text-[var(--brand)]">
                  {cycle.periodIndex}
                </span>
                <div>
                  <p className="font-medium text-stone-900">
                    {cycle.beneficiaryOrder?.membership.user.fullName ?? "—"}
                  </p>
                  <p className="text-xs text-stone-500">
                    Échéance : {cycle.periodDue.toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={cycle.status === "ACTIVE" ? "default" : "neutral"}>
                  {CYCLE_STATUS_LABELS[cycle.status]}
                </Badge>
                {cycle.payout && (
                  <Badge variant={cycle.payout.status === "CONFIRMED" ? "default" : "warning"}>
                    {PAYOUT_STATUS_LABELS[cycle.payout.status]} · {formatXof(cycle.payout.amountXof)}
                  </Badge>
                )}
                <span className="text-sm text-stone-500">
                  {formatXof(confirmed)} / {formatXof(expected)} confirmé
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
