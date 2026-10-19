import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { TONTINE_STATUS_LABELS } from "@/lib/labels";

const TONTINE_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "warning" | "neutral"> = {
  ACTIVE: "default",
  DRAFT: "neutral",
  PAUSED: "warning",
  COMPLETED: "outline",
  ARCHIVED: "neutral",
};

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();

  const [tontines, users, userCount, tontineCount, activeTontineCount, confirmedAgg] = await Promise.all([
    prisma.tontine.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        contributionAmountXof: true,
        createdAt: true,
        createdBy: { select: { fullName: true, phone: true } },
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        platformRole: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.count(),
    prisma.tontine.count(),
    prisma.tontine.count({ where: { status: "ACTIVE" } }),
    prisma.contribution.aggregate({ _sum: { amountConfirmedXof: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Administration — vue d&apos;ensemble</h1>
        <p className="text-sm text-stone-500">
          Vue en lecture seule sur toute la plateforme, tous responsables et tontines confondus.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Utilisateurs</CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Tontines</CardDescription>
            <CardTitle className="text-3xl">{tontineCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Tontines actives</CardDescription>
            <CardTitle className="text-3xl">{activeTontineCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card accent>
          <CardHeader className="pb-2">
            <CardDescription>Total confirmé (toutes tontines)</CardDescription>
            <CardTitle className="text-2xl">{formatXof(confirmedAgg._sum.amountConfirmedXof ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tontines ({tontineCount})</CardTitle>
          <CardDescription>Les 50 plus récentes.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
                <th className="py-2 pr-4 font-medium">Responsable</th>
                <th className="py-2 pr-4 font-medium">Membres</th>
                <th className="py-2 pr-4 font-medium">Cotisation</th>
                <th className="py-2 pr-4 font-medium">Créée le</th>
              </tr>
            </thead>
            <tbody>
              {tontines.map((t) => (
                <tr key={t.id} className="border-b border-stone-100">
                  <td className="py-2 pr-4">
                    <Link href={`/tontines/${t.id}`} className="font-medium text-brand hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={TONTINE_STATUS_VARIANT[t.status] ?? "neutral"}>
                      {TONTINE_STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {t.createdBy.fullName}
                    <span className="block text-xs text-stone-400">{t.createdBy.phone}</span>
                  </td>
                  <td className="py-2 pr-4">{t._count.memberships}</td>
                  <td className="py-2 pr-4">
                    {t.contributionAmountXof != null ? formatXof(t.contributionAmountXof) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-stone-500">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
              {tontines.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-stone-500">
                    Aucune tontine pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({userCount})</CardTitle>
          <CardDescription>Les 50 plus récents.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Téléphone</th>
                <th className="py-2 pr-4 font-medium">Rôle plateforme</th>
                <th className="py-2 pr-4 font-medium">Tontines</th>
                <th className="py-2 pr-4 font-medium">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-medium">{u.fullName}</td>
                  <td className="py-2 pr-4 text-stone-500">{u.phone}</td>
                  <td className="py-2 pr-4">
                    {u.platformRole === "ADMIN" ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="neutral">Utilisateur</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4">{u._count.memberships}</td>
                  <td className="py-2 pr-4 text-stone-500">{u.createdAt.toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-stone-500">
                    Aucun utilisateur pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
