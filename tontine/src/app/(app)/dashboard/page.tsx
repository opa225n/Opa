import Link from "next/link";
import { Shield } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BrandCornerPattern } from "@/components/brand/pattern";
import { formatXof } from "@/lib/money";
import { TONTINE_STATUS_LABELS } from "@/lib/labels";

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.tontineMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: {
      id: true,
      tontineId: true,
      tontine: {
        select: {
          status: true,
          name: true,
          contributionAmountXof: true,
          _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
        },
      },
    },
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

  const [featuredTontine, totalAccumulatedAgg, activeCycle, featuredMemberCount, payoutsConfirmedCount] =
    featuredTontineId
      ? await Promise.all([
          prisma.tontine.findUnique({
            where: { id: featuredTontineId },
            select: { id: true, name: true, status: true },
          }),
          prisma.contribution.aggregate({
            where: { tontineId: featuredTontineId },
            _sum: { amountConfirmedXof: true },
          }),
          prisma.tontineCycle.findFirst({
            where: { tontineId: featuredTontineId, status: "ACTIVE" },
            include: { contributions: true },
          }),
          prisma.tontineMembership.count({ where: { tontineId: featuredTontineId, status: "ACTIVE" } }),
          prisma.payout.count({ where: { tontineId: featuredTontineId, status: "CONFIRMED" } }),
        ])
      : [null, null, null, 0, 0];

  const totalAccumulatedXof = totalAccumulatedAgg?._sum.amountConfirmedXof ?? 0;
  const cycleExpectedXof = activeCycle?.contributions.reduce((s, c) => s + c.amountExpectedXof, 0) ?? 0;
  const cycleConfirmedXof = activeCycle?.contributions.reduce((s, c) => s + c.amountConfirmedXof, 0) ?? 0;
  const cycleProgressPct = cycleExpectedXof > 0 ? (cycleConfirmedXof / cycleExpectedXof) * 100 : 0;
  const cycleConfirmedCount = activeCycle?.contributions.filter((c) => c.status === "CONFIRMED").length ?? 0;
  const cycleMemberCount = activeCycle?.contributions.length ?? 0;

  const firstName = (user.name ?? "").trim().split(/\s+/)[0] || "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-lg text-stone-700">
          Bonjour{firstName ? ` ${firstName}` : ""} <span aria-hidden="true">👋</span>
        </p>
        <p className="text-sm text-stone-500">Ta tontine, ta force, ta famille.</p>
      </div>

      {featuredTontine ? (
        <div className="relative overflow-hidden rounded-2xl bg-[var(--brand)] p-6 text-[var(--background)] shadow-lg">
          <BrandCornerPattern className="pointer-events-none absolute right-0 top-0 h-28 w-28" />
          <div className="relative flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-semibold">{featuredTontine.name}</p>
              {featuredTontine.status === "ACTIVE" && (
                <Badge className="border-none bg-emerald-500/20 text-emerald-200">⊙ En cours</Badge>
              )}
            </div>

            <div>
              <p className="font-display text-3xl font-semibold">{formatXof(totalAccumulatedXof)}</p>
              <p className="text-xs text-[var(--background)]/60">Montant total accumulé</p>
            </div>

            {nextDue ? (
              <div className="flex flex-col gap-3 border-t border-[var(--background)]/15 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-[var(--background)]/70">Prochaine cotisation</p>
                    <p className="font-medium">{nextDue.cycle.periodDue.toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--background)]/70">Montant</p>
                    <p className="text-xl font-semibold">
                      {formatXof(
                        Math.max(
                          nextDue.amountExpectedXof + nextDue.penaltyXof - nextDue.amountConfirmedXof,
                          0
                        )
                      )}
                    </p>
                    <p className="text-xs text-[var(--background)]/60">par membre</p>
                  </div>
                </div>
                <Link href={`/tontines/${featuredTontine.id}/cotisations?cycle=${nextDue.cycle.periodIndex}`}>
                  <Button variant="gold" size="lg">
                    💳 Payer maintenant
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
                <p className="text-xs text-[var(--background)]/70">Progression de la cagnotte</p>
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

      {featuredTontine && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xl font-semibold text-[var(--foreground)]">{featuredMemberCount}</p>
              <p className="text-xs text-stone-500">Membres</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xl font-semibold text-[var(--foreground)]">
                {formatXof(totalAccumulatedXof)}
              </p>
              <p className="text-xs text-stone-500">Total collecté</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xl font-semibold text-[var(--foreground)]">
                {cycleConfirmedCount}/{cycleMemberCount}
              </p>
              <p className="text-xs text-stone-500">Cotisations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xl font-semibold text-[var(--foreground)]">{payoutsConfirmedCount}</p>
              <p className="text-xs text-stone-500">Tirage effectué</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Mes tontines</CardTitle>
          <Link href="/tontines" className="text-sm font-medium text-brand hover:underline">
            Voir toutes
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {memberships.length === 0 && (
            <p className="text-sm text-stone-500">Vous n&apos;avez pas encore de tontine.</p>
          )}
          {memberships.slice(0, 5).map((m) => (
            <Link
              key={m.id}
              href={`/tontines/${m.tontineId}`}
              className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
            >
              <div>
                <p className="font-medium text-stone-900">{m.tontine.name}</p>
                <p className="text-xs text-stone-500">
                  {m.tontine._count.memberships} membres
                  {m.tontine.contributionAmountXof
                    ? ` • ${formatXof(m.tontine.contributionAmountXof)}`
                    : ""}
                </p>
              </div>
              <Badge variant={m.tontine.status === "ACTIVE" ? "default" : "neutral"}>
                {m.tontine.status === "ACTIVE" ? "En cours" : TONTINE_STATUS_LABELS[m.tontine.status]}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-brand-gold/30 bg-brand-gold/5">
        <CardContent className="flex items-center gap-3 py-4">
          <Shield className="h-6 w-6 shrink-0 text-brand-gold" />
          <div>
            <p className="text-sm font-medium text-stone-900">Paiements sécurisés</p>
            <p className="text-xs text-stone-500">Vos transactions sont protégées et confidentielles.</p>
          </div>
        </CardContent>
      </Card>

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
