import Link from "next/link";
import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { FREQUENCY_LABELS, CYCLE_STATUS_LABELS } from "@/lib/labels";
import { StartTontineButton } from "./start-tontine-button";

export default async function TontineOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tontine, membership } = await getTontineContext(id);

  const [memberCount, currentCycle, nextCycle, pendingVerificationCount] = await Promise.all([
    prisma.tontineMembership.count({ where: { tontineId: id, status: "ACTIVE" } }),
    prisma.tontineCycle.findFirst({
      where: { tontineId: id, status: "ACTIVE" },
      include: {
        beneficiaryOrder: { include: { membership: { include: { user: true } } } },
        contributions: true,
        payout: true,
      },
      orderBy: { periodIndex: "asc" },
    }),
    prisma.tontineCycle.findFirst({
      where: { tontineId: id, status: "PENDING" },
      include: { beneficiaryOrder: { include: { membership: { include: { user: true } } } } },
      orderBy: { periodIndex: "asc" },
    }),
    prisma.payment.count({
      where: { contribution: { tontineId: id }, status: "DECLARED" },
    }),
  ]);

  const expectedThisCycle = currentCycle
    ? currentCycle.contributions.reduce((s, c) => s + c.amountExpectedXof, 0)
    : 0;
  const confirmedThisCycle = currentCycle
    ? currentCycle.contributions.reduce((s, c) => s + c.amountConfirmedXof, 0)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {tontine.status === "DRAFT" && (
        <Card>
          <CardHeader>
            <CardTitle>Tontine en préparation</CardTitle>
            <CardDescription>
              Ajoutez vos membres et définissez l&apos;ordre des bénéficiaires avant de démarrer.
              {" "}
              {memberCount} membre(s) pour le moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href={`/tontines/${id}/membres`}>
              <Button variant="outline">Gérer les membres</Button>
            </Link>
            {membership.role === "RESPONSABLE" && <StartTontineButton tontineId={id} />}
          </CardContent>
        </Card>
      )}

      {tontine.status === "ACTIVE" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bénéficiaire actuel</CardTitle>
              <CardDescription>
                Tour {currentCycle?.periodIndex} · échéance le{" "}
                {currentCycle?.periodDue.toLocaleDateString("fr-FR")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-stone-900">
                {currentCycle?.beneficiaryOrder?.membership.user.fullName ?? "—"}
              </p>
              <p className="text-sm text-stone-500">
                Versement prévu : {currentCycle ? formatXof(currentCycle.payout?.amountXof ?? 0) : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prochain bénéficiaire</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-stone-900">
                {nextCycle?.beneficiaryOrder?.membership.user.fullName ?? "Dernier tour en cours"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cotisations du tour en cours</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                Attendu : <span className="font-semibold">{formatXof(expectedThisCycle)}</span>
              </p>
              <p>
                Confirmé : <span className="font-semibold text-emerald-700">{formatXof(confirmedThisCycle)}</span>
              </p>
              {pendingVerificationCount > 0 && (
                <Badge variant="warning" className="mt-1 w-fit">
                  {pendingVerificationCount} paiement(s) déclaré(s) à vérifier
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-stone-600">
              <p>Montant : {formatXof(tontine.contributionAmountXof ?? 0)}</p>
              <p>Fréquence : {FREQUENCY_LABELS[tontine.frequency]}</p>
              <p>Membres actifs : {memberCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {currentCycle && (
        <Card>
          <CardHeader>
            <CardTitle>Statut du tour</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{CYCLE_STATUS_LABELS[currentCycle.status]}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
