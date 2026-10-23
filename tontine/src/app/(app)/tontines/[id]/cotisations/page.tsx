import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { CONTRIBUTION_STATUS_LABELS } from "@/lib/labels";
import { PaymentManager } from "./payment-manager";
import { ApplyPenaltiesButton } from "./apply-penalties-button";

export default async function ContributionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cycle?: string; group?: string }>;
}) {
  const { id } = await params;
  const { tontine, membership } = await getTontineContext(id);
  const { cycle: cycleParam, group: groupParam } = await searchParams;

  if (tontine.status === "DRAFT") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-stone-500">
          Les cotisations apparaîtront ici une fois la tontine démarrée.
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
    orderBy: { periodIndex: "asc" },
    select: { id: true, periodIndex: true, status: true },
  });

  const selectedCycle = cycleParam
    ? cycles.find((c) => String(c.periodIndex) === cycleParam)
    : cycles.find((c) => c.status === "ACTIVE") ?? cycles[0];

  const contributions = selectedCycle
    ? await prisma.contribution.findMany({
        where: { cycleId: selectedCycle.id },
        include: {
          membership: { include: { user: true } },
          payments: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { membership: { displayOrder: "asc" } },
      })
    : [];

  const canManage = ["RESPONSABLE", "TRESORIER"].includes(membership.role);

  return (
    <div className="flex flex-col gap-4">
      {canManage && tontine.latePenaltyAmountXof > 0 && (
        <ApplyPenaltiesButton tontineId={id} />
      )}

      {groups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {groups.map((g) => (
            <a
              key={g.id}
              href={`?group=${g.id}`}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                selectedGroupId === g.id
                  ? "bg-emerald-800 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {g.name}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {cycles.map((c) => (
          <a
            key={c.id}
            href={selectedGroupId ? `?group=${selectedGroupId}&cycle=${c.periodIndex}` : `?cycle=${c.periodIndex}`}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              selectedCycle?.id === c.id
                ? "bg-emerald-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Tour {c.periodIndex}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {contributions.map((c) => {
          const totalDueXof = c.amountExpectedXof + c.penaltyXof;
          const remaining = Math.max(totalDueXof - c.amountConfirmedXof, 0);
          return (
            <Card key={c.id} data-testid={`contribution-card-${c.membershipId}`}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{c.membership.user.fullName}</CardTitle>
                <div className="flex items-center gap-2">
                  {c.penaltyXof > 0 && (
                    <Badge variant="destructive">+{formatXof(c.penaltyXof)} pénalité</Badge>
                  )}
                  <Badge
                    variant={
                      c.status === "CONFIRMED"
                        ? "default"
                        : c.status === "REJECTED"
                          ? "destructive"
                          : c.status === "PARTIAL" || c.status === "DECLARED"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {CONTRIBUTION_STATUS_LABELS[c.status]}
                  </Badge>
                  <span className="text-sm text-stone-500">
                    {formatXof(c.amountConfirmedXof)} / {formatXof(totalDueXof)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <PaymentManager
                  contributionId={c.id}
                  payments={c.payments.map((p) => ({
                    id: p.id,
                    amountXof: p.amountXof,
                    method: p.method,
                    status: p.status,
                    paidAt: p.paidAt.toISOString(),
                    transactionRef: p.transactionRef,
                    isManualEntry: p.isManualEntry,
                    notes: p.notes,
                  }))}
                  canSelfDeclare={c.membershipId === membership.id}
                  canManage={canManage}
                  remainingXof={remaining}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
