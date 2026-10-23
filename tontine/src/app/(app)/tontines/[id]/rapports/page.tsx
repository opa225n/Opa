import { Download, Users, AlertTriangle } from "lucide-react";
import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatXof } from "@/lib/money";

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getTontineContext(id);

  const byMember = await prisma.contribution.groupBy({
    by: ["membershipId"],
    where: { tontineId: id },
    _sum: { amountExpectedXof: true, amountConfirmedXof: true },
  });

  const memberships = await prisma.tontineMembership.findMany({
    where: { id: { in: byMember.map((b) => b.membershipId) } },
    include: { user: true },
  });
  const membershipById = new Map(memberships.map((m) => [m.id, m]));

  const lateContributions = await prisma.contribution.findMany({
    where: {
      tontineId: id,
      status: { in: ["DUE", "PARTIAL", "DECLARED"] },
      cycle: { periodDue: { lt: new Date() } },
    },
    include: { membership: { include: { user: true } }, cycle: true },
    orderBy: { cycle: { periodDue: "asc" } },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-[var(--brand-gold)]" /> Export
          </CardTitle>
          <CardDescription>
            Export CSV complet des cotisations et paiements (ouvrable dans Excel/Google Sheets).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href={`/api/tontines/${id}/export`}>
            <Button variant="outline">
              <Download className="h-4 w-4" /> Télécharger le CSV
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--brand-gold)]" /> Rapport par membre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="py-2">Membre</th>
                  <th className="py-2">Attendu</th>
                  <th className="py-2">Confirmé</th>
                  <th className="py-2">Écart</th>
                </tr>
              </thead>
              <tbody>
                {byMember.map((b) => {
                  const m = membershipById.get(b.membershipId);
                  const expected = b._sum.amountExpectedXof ?? 0;
                  const confirmed = b._sum.amountConfirmedXof ?? 0;
                  return (
                    <tr key={b.membershipId} className="border-b border-stone-100">
                      <td className="py-2">{m?.user.fullName ?? "—"}</td>
                      <td className="py-2">{formatXof(expected)}</td>
                      <td className="py-2 text-emerald-700">{formatXof(confirmed)}</td>
                      <td className="py-2 text-red-600">{formatXof(expected - confirmed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--brand-gold)]" /> Rapport des retards
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {lateContributions.length === 0 && (
            <p className="text-sm text-stone-500">Aucun retard constaté.</p>
          )}
          {lateContributions.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span>
                {c.membership.user.fullName} · tour {c.cycle.periodIndex} (échéance{" "}
                {c.cycle.periodDue.toLocaleDateString("fr-FR")})
              </span>
              <span className="font-medium text-red-600">
                {formatXof(c.amountExpectedXof - c.amountConfirmedXof)} dû
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
