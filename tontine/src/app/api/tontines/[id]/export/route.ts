import { NextResponse } from "next/server";
import { requireMembership, ForbiddenError, UnauthenticatedError } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { CONTRIBUTION_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireMembership(id);
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    throw error;
  }

  const contributions = await prisma.contribution.findMany({
    where: { tontineId: id },
    include: {
      membership: { include: { user: true } },
      cycle: true,
      payments: true,
    },
    orderBy: [{ cycle: { periodIndex: "asc" } }, { membership: { displayOrder: "asc" } }],
  });

  const rows = contributions.flatMap((c) => {
    if (c.payments.length === 0) {
      return [[
        c.cycle.periodIndex,
        c.cycle.periodDue.toISOString().slice(0, 10),
        c.membership.user.fullName,
        c.membership.user.phone,
        c.amountExpectedXof,
        c.amountConfirmedXof,
        CONTRIBUTION_STATUS_LABELS[c.status] ?? c.status,
        "",
        "",
        "",
        "",
      ]];
    }
    return c.payments.map((p) => [
      c.cycle.periodIndex,
      c.cycle.periodDue.toISOString().slice(0, 10),
      c.membership.user.fullName,
      c.membership.user.phone,
      c.amountExpectedXof,
      c.amountConfirmedXof,
      CONTRIBUTION_STATUS_LABELS[c.status] ?? c.status,
      p.amountXof,
      PAYMENT_METHOD_LABELS[p.method] ?? p.method,
      PAYMENT_STATUS_LABELS[p.status] ?? p.status,
      p.paidAt.toISOString().slice(0, 10),
    ]);
  });

  const csv = toCsv(
    [
      "Tour",
      "Échéance",
      "Membre",
      "Téléphone",
      "Montant attendu (FCFA)",
      "Montant confirmé (FCFA)",
      "Statut cotisation",
      "Montant paiement (FCFA)",
      "Mode de paiement",
      "Statut paiement",
      "Date paiement",
    ],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tontine-${id}-cotisations.csv"`,
    },
  });
}
