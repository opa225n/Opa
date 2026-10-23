import Link from "next/link";
import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { FREQUENCY_LABELS } from "@/lib/labels";
import { StartTontineButton } from "./start-tontine-button";

export default async function TontineOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tontine, membership } = await getTontineContext(id);

  const [memberCount, groups, activeCycles, nextCycles, pendingVerificationCount] = await Promise.all([
    prisma.tontineMembership.count({ where: { tontineId: id, status: "ACTIVE" } }),
    prisma.tontineGroup.findMany({ where: { tontineId: id }, orderBy: { displayOrder: "asc" } }),
    // Avec des groupes, chaque groupe a son propre tour ACTIVE en parallèle — on les récupère
    // tous plutôt qu'un seul (findFirst choisirait arbitrairement l'un d'eux).
    prisma.tontineCycle.findMany({
      where: { tontineId: id, status: "ACTIVE" },
      include: {
        beneficiaryOrder: { include: { membership: { include: { user: true } } } },
        contributions: true,
        payout: true,
      },
      orderBy: { periodIndex: "asc" },
    }),
    prisma.tontineCycle.findMany({
      where: { tontineId: id, status: "PENDING" },
      include: { beneficiaryOrder: { include: { membership: { include: { user: true } } } } },
      orderBy: { periodIndex: "asc" },
      distinct: ["groupId"],
    }),
    prisma.payment.count({
      where: { contribution: { tontineId: id }, status: "DECLARED" },
    }),
  ]);

  const expectedThisCycle = activeCycles.reduce(
    (sum, c) => sum + c.contributions.reduce((s, ctr) => s + ctr.amountExpectedXof, 0),
    0
  );
  const confirmedThisCycle = activeCycles.reduce(
    (sum, c) => sum + c.contributions.reduce((s, ctr) => s + ctr.amountConfirmedXof, 0),
    0
  );

  const cycleSections =
    groups.length > 0
      ? groups.map((g) => ({
          label: g.name,
          current: activeCycles.find((c) => c.groupId === g.id),
          next: nextCycles.find((c) => c.groupId === g.id),
        }))
      : [
          {
            label: null,
            current: activeCycles[0],
            next: nextCycles[0],
          },
        ];

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
          {cycleSections.map((section, i) => (
            <div key={section.label ?? i} className="contents">
              {section.label && (
                <p className="col-span-full text-sm font-medium text-stone-500">{section.label}</p>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Bénéficiaire actuel</CardTitle>
                  <CardDescription>
                    Tour {section.current?.periodIndex} · échéance le{" "}
                    {section.current?.periodDue.toLocaleDateString("fr-FR")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-stone-900">
                    {section.current?.beneficiaryOrder?.membership.user.fullName ?? "—"}
                  </p>
                  <p className="text-sm text-stone-500">
                    Versement prévu :{" "}
                    {section.current ? formatXof(section.current.payout?.amountXof ?? 0) : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prochain bénéficiaire</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-stone-900">
                    {section.next?.beneficiaryOrder?.membership.user.fullName ?? "Dernier tour en cours"}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}

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

    </div>
  );
}
