import { Coins, CalendarDays, Clock, Users, LogOut, Scale, CheckCircle2, ScrollText } from "lucide-react";
import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatXof } from "@/lib/money";
import { AcceptRulesButton } from "./accept-rules-button";

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tontine, user } = await getTontineContext(id);

  if (tontine.status === "DRAFT") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-stone-500">
          Le règlement sera généré et figé au démarrage de la tontine.
        </CardContent>
      </Card>
    );
  }

  const rules = await prisma.tontineRules.findFirst({
    where: { tontineId: id, status: "ACTIVE" },
    orderBy: { version: "desc" },
    include: { acceptances: true },
  });

  if (!rules) return null;

  const content = rules.content as {
    montant: number;
    frais: number;
    frequence: string;
    nombreDeTours: number;
    groupes?: { nom: string | null; membres: number }[];
    dateDemarrage: string;
    reglesDeRetard: string;
    conditionsEntreeSortie: string;
    procedureContestation: string;
    reglesValidation: string;
  };

  const myAcceptance = rules.acceptances.find((a) => a.userId === user.id);

  const items = [
    {
      icon: Coins,
      label: "Montant de cotisation",
      value: `${formatXof(content.montant)}${content.frais > 0 ? ` + ${formatXof(content.frais)} de frais` : ""}`,
    },
    { icon: CalendarDays, label: "Nombre de tours", value: String(content.nombreDeTours) },
    ...(content.groupes && content.groupes.length > 0
      ? [
          {
            icon: Users,
            label: "Groupes",
            value: content.groupes.map((g) => `${g.nom} (${g.membres} membres)`).join(", "),
          },
        ]
      : []),
    { icon: Clock, label: "Règles de retard", value: content.reglesDeRetard },
    { icon: LogOut, label: "Conditions d'entrée/sortie", value: content.conditionsEntreeSortie },
    { icon: Scale, label: "Procédure de contestation", value: content.procedureContestation },
    { icon: CheckCircle2, label: "Règles de validation", value: content.reglesValidation },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[var(--brand-gold)]" /> Règlement — version{" "}
            {rules.version}
          </CardTitle>
          <CardDescription>
            Généré automatiquement au démarrage le{" "}
            {rules.createdAt.toLocaleDateString("fr-FR")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-gold)]" />
              <div>
                <p className="text-sm font-semibold text-stone-900">{label}</p>
                <p className="text-sm text-stone-600">{value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          {myAcceptance ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Accepté le{" "}
              {myAcceptance.acceptedAt.toLocaleDateString("fr-FR")}
            </p>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                Vous n&apos;avez pas encore accepté ce règlement.
              </p>
              <AcceptRulesButton rulesId={rules.id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
