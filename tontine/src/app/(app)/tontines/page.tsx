import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { TONTINE_STATUS_LABELS, FREQUENCY_LABELS, MEMBER_ROLE_LABELS } from "@/lib/labels";

export default async function TontinesPage() {
  const user = await requireUser();

  const memberships = await prisma.tontineMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      tontine: {
        include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Mes tontines</h1>
          <p className="text-sm text-stone-500">Toutes les tontines dont vous êtes membre.</p>
        </div>
        <Link href="/tontines/nouveau">
          <Button>Nouvelle tontine</Button>
        </Link>
      </div>

      {memberships.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-stone-500">
            Vous ne faites encore partie d&apos;aucune tontine.{" "}
            <Link href="/tontines/nouveau" className="font-medium text-brand underline-offset-4 hover:underline">
              Créez-en une
            </Link>{" "}
            ou demandez un lien d&apos;invitation à un responsable.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {memberships.map((m) => (
            <Link key={m.id} href={`/tontines/${m.tontineId}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{m.tontine.name}</CardTitle>
                    {m.tontine.isDemo && <Badge variant="warning">Démo</Badge>}
                  </div>
                  <CardDescription>
                    {m.tontine._count.memberships} membre(s) · {FREQUENCY_LABELS[m.tontine.frequency]}
                    {m.tontine.contributionAmountXof
                      ? ` · ${formatXof(m.tontine.contributionAmountXof)}`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Badge variant={m.tontine.status === "ACTIVE" ? "default" : "neutral"}>
                    {TONTINE_STATUS_LABELS[m.tontine.status]}
                  </Badge>
                  <Badge variant="outline">{MEMBER_ROLE_LABELS[m.role]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
