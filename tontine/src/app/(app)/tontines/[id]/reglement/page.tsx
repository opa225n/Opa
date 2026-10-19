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
    dateDemarrage: string;
    reglesDeRetard: string;
    conditionsEntreeSortie: string;
    procedureContestation: string;
    reglesValidation: string;
  };

  const myAcceptance = rules.acceptances.find((a) => a.userId === user.id);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Règlement — version {rules.version}</CardTitle>
          <CardDescription>
            Généré automatiquement au démarrage le{" "}
            {rules.createdAt.toLocaleDateString("fr-FR")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-stone-700">
          <p>
            <strong>Montant de cotisation :</strong> {formatXof(content.montant)}
            {content.frais > 0 && ` + ${formatXof(content.frais)} de frais`}
          </p>
          <p>
            <strong>Nombre de tours :</strong> {content.nombreDeTours}
          </p>
          <p>
            <strong>Règles de retard :</strong> {content.reglesDeRetard}
          </p>
          <p>
            <strong>Conditions d&apos;entrée/sortie :</strong> {content.conditionsEntreeSortie}
          </p>
          <p>
            <strong>Procédure de contestation :</strong> {content.procedureContestation}
          </p>
          <p>
            <strong>Règles de validation :</strong> {content.reglesValidation}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          {myAcceptance ? (
            <p className="text-sm text-emerald-700">
              Accepté le {myAcceptance.acceptedAt.toLocaleDateString("fr-FR")}
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
