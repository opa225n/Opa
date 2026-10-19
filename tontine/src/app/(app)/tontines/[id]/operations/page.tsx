import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
} from "@/lib/labels";
import { PayoutConfirmForm } from "./payout-confirm-form";

export default async function OperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await getTontineContext(id);
  const canManage = ["RESPONSABLE", "TRESORIER"].includes(membership.role);

  const [payments, payouts] = await Promise.all([
    prisma.payment.findMany({
      where: { contribution: { tontineId: id } },
      include: { contribution: { include: { membership: { include: { user: true } }, cycle: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.payout.findMany({
      where: { tontineId: id },
      include: { membership: { include: { user: true } }, cycle: true },
      orderBy: { cycle: { periodIndex: "asc" } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Versements aux bénéficiaires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm">
              <span>
                Tour {p.cycle.periodIndex} · {p.membership.user.fullName}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatXof(p.amountXof)}</span>
                <Badge variant={p.status === "CONFIRMED" ? "default" : "warning"}>
                  {PAYOUT_STATUS_LABELS[p.status]}
                </Badge>
                {canManage && p.status === "PENDING" && <PayoutConfirmForm payoutId={p.id} />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-2 text-sm last:border-0">
              <span>
                Tour {p.contribution.cycle.periodIndex} · {p.contribution.membership.user.fullName} ·{" "}
                {PAYMENT_METHOD_LABELS[p.method]}
              </span>
              <div className="flex items-center gap-2">
                <span>{formatXof(p.amountXof)}</span>
                <Badge
                  variant={
                    p.status === "CONFIRMED" ? "default" : p.status === "REJECTED" ? "destructive" : "warning"
                  }
                >
                  {PAYMENT_STATUS_LABELS[p.status]}
                </Badge>
                <span className="text-xs text-stone-400">{p.createdAt.toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-stone-500">Aucun paiement encore.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
