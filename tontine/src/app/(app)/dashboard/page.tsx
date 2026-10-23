import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BrandCornerPattern } from "@/components/brand/pattern";
import { formatXof } from "@/lib/money";

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.tontineMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true, tontineId: true, tontine: { select: { status: true, name: true } } },
  });

  const tontineIds = memberships.map((m) => m.tontineId);
  const membershipIds = memberships.map((m) => m.id);
  const activeTontineCount = memberships.filter((m) => m.tontine.status === "ACTIVE").length;

  const [memberTotal, contributionsAgg, myDueContributions, recentPayments, unreadNotifications, myNextCycles] =
    await Promise.all([
      prisma.tontineMembership.count({ where: { tontineId: { in: tontineIds }, status: "ACTIVE" } }),
      prisma.contribution.groupBy({
        by: ["status"],
        where: { tontineId: { in: tontineIds } },
        _sum: { amountExpectedXof: true, amountConfirmedXof: true },
      }),
      prisma.contribution.findMany({
        where: {
          membershipId: { in: membershipIds },
          status: { in: ["DUE", "PARTIAL", "DECLARED"] },
        },
        include: { tontine: true, cycle: true },
        orderBy: { cycle: { periodDue: "asc" } },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { contribution: { tontineId: { in: tontineIds } } },
        include: { contribution: { include: { membership: { include: { user: true } }, tontine: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      prisma.tontineCycle.findMany({
        where: { tontineId: { in: tontineIds }, status: "ACTIVE" },
        include: { tontine: true, beneficiaryOrder: { include: { membership: { include: { user: true } } } } },
      }),
    ]);

  const expectedTotal = contributionsAgg.reduce((s, g) => s + (g._sum.amountExpectedXof ?? 0), 0);
  const confirmedTotal = contributionsAgg.reduce((s, g) => s + (g._sum.amountConfirmedXof ?? 0), 0);
  const pendingVerification = contributionsAgg
    .filter((g) => g.status === "DECLARED" || g.status === "PENDING_VERIFICATION")
    .reduce((s, g) => s + (g._sum.amountExpectedXof ?? 0), 0);
  const lateCount = await prisma.contribution.count({
    where: {
      tontineId: { in: tontineIds },
      status: { in: ["DUE", "PARTIAL", "DECLARED"] },
      cycle: { periodDue: { lt: new Date() } },
    },
  });

  // "Tontine principale" mise en avant : celle dont l'échéance est la plus proche, sinon la
  // première tontine active du membre.
  const featuredTontineId = myDueContributions[0]?.tontineId ?? tontineIds[0];
  const nextDue = myDueContributions[0];

  const [featuredTontine, totalAccumulatedAgg, activeCycle] = featuredTontineId
    ? await Promise.all([
        prisma.tontine.findUnique({ where: { id: featuredTontineId }, select: { id: true, name: true } }),
        prisma.contribution.aggregate({
          where: { tontineId: featuredTontineId },
          _sum: { amountConfirmedXof: true },
        }),
        prisma.tontineCycle.findFirst({
          where: { tontineId: featuredTontineId, status: "ACTIVE" },
          include: { contributions: true },
        }),
      ])
    : [null, null, null];

  const totalAccumulatedXof = totalAccumulatedAgg?._sum.amountConfirmedXof ?? 0;
  const cycleExpectedXof = activeCycle?.contributions.reduce((s, c) => s + c.amountExpectedXof, 0) ?? 0;
  const cycleConfirmedXof = activeCycle?.contributions.reduce((s, c) => s + c.amountConfirmedXof, 0) ?? 0;
  const cycleProgressPct = cycleExpectedXof > 0 ? (cycleConfirmedXof / cycleExpectedXof) * 100 : 0;

  const firstName = (user.name ?? "").trim().split(/\s+/)[0] || "";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-stone-700">
        Bonjour{firstName ? ` ${firstName}` : ""} <span aria-hidden="true">👋</span>
      </p>

      {featuredTontine ? (
        <div className="relative overflow-hidden rounded-2xl bg-[var(--brand)] p-6 text-[var(--background)] shadow-lg">
          <BrandCornerPattern className="pointer-events-none absolute right-0 top-0 h-28 w-28" />
          <div className="relative flex flex-col gap-5">
            <div>
              <p className="text-sm text-[var(--background)]/70">{featuredTontine.name}</p>
              <p className="font-display text-3xl font-semibold">{formatXof(totalAccumulatedXof)}</p>
              <p className="text-xs text-[var(--background)]/60">Montant total accumulé</p>
            </div>

            {nextDue ? (
              <div className="flex flex-col gap-3 border-t border-[var(--background)]/15 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs text-[var(--background)]/70">Prochaine cotisation</p>
                  <p className="text-xl font-semibold">
                    {formatXof(
                      Math.max(
                        nextDue.amountExpectedXof + nextDue.penaltyXof - nextDue.amountConfirmedXof,
                        0
                      )
                    )}
                  </p>
                  <p className="text-xs text-[var(--background)]/60">
                    Le {nextDue.cycle.periodDue.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Link href={`/tontines/${featuredTontine.id}/cotisations?cycle=${nextDue.cycle.periodIndex}`}>
                  <Button variant="gold" size="lg">
                    Payer maintenant
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="border-t border-[var(--background)]/15 pt-4 text-sm text-[var(--background)]/70">
                Aucune cotisation en attente pour le moment.
              </p>
            )}

            {activeCycle && cycleExpectedXof > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-[var(--background)]/70">
                  Progression de la cagnotte (tour en cours)
                </p>
                <Progress value={cycleProgressPct} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-stone-600">Vous n&apos;avez pas encore de tontine active.</p>
            <Link href="/tontines/nouveau">
              <Button>Créer une tontine</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
          Vue d&apos;ensemble
        </h2>
        <p className="text-sm text-stone-500">Toutes vos tontines confondues.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Tontines actives</CardDescription>
            <CardTitle className="text-3xl">{activeTontineCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Membres (toutes tontines)</CardDescription>
            <CardTitle className="text-3xl">{memberTotal}</CardTitle>
          </CardHeader>
        </Card>
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Cotisations en retard</CardDescription>
            <CardTitle className="text-3xl text-red-600">{lateCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Notifications non lues</CardDescription>
            <CardTitle className="text-3xl">{unreadNotifications}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cotisations — toutes tontines confondues</CardTitle>
          <CardDescription>
            Distinction stricte entre montant attendu, en attente de vérification et confirmé.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-sm text-stone-500">Attendu</p>
            <p className="text-xl font-semibold">{formatXof(expectedTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">En attente de vérification</p>
            <p className="text-xl font-semibold text-amber-600">{formatXof(pendingVerification)}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Confirmé</p>
            <p className="text-xl font-semibold text-emerald-700">{formatXof(confirmedTotal)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mes prochaines échéances</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {myDueContributions.length === 0 && (
              <p className="text-sm text-stone-500">Aucune cotisation en attente. 🎉</p>
            )}
            {myDueContributions.map((c) => (
              <Link
                key={c.id}
                href={`/tontines/${c.tontineId}/cotisations?cycle=${c.cycle.periodIndex}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
              >
                <span>
                  {c.tontine.name} · tour {c.cycle.periodIndex}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={c.cycle.periodDue < new Date() ? "destructive" : "warning"}>
                    {c.cycle.periodDue.toLocaleDateString("fr-FR")}
                  </Badge>
                  {formatXof(c.amountExpectedXof - c.amountConfirmedXof)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bénéficiaires du tour en cours</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {myNextCycles.length === 0 && <p className="text-sm text-stone-500">Aucun tour actif.</p>}
            {myNextCycles.map((c) => (
              <Link
                key={c.id}
                href={`/tontines/${c.tontineId}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
              >
                <span>{c.tontine.name}</span>
                <span className="font-medium">{c.beneficiaryOrder?.membership.user.fullName}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières opérations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentPayments.length === 0 && <p className="text-sm text-stone-500">Aucune opération encore.</p>}
          {recentPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {p.contribution.membership.user.fullName} · {p.contribution.tontine.name}
              </span>
              <span className="flex items-center gap-2">
                {formatXof(p.amountXof)}
                <Badge variant={p.status === "CONFIRMED" ? "default" : "warning"}>{p.status}</Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href="/tontines/nouveau">
          <Button>Créer une nouvelle tontine</Button>
        </Link>
      </div>
    </div>
  );
}
