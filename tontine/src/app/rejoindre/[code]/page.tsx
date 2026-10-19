import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AcceptInvitationButton } from "./accept-invitation-button";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await auth();
  const next = `/rejoindre/${code}`;

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    include: { tontine: true, invitedBy: true },
  });

  if (!invitation) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Alert variant="destructive">Ce lien d&apos;invitation est invalide.</Alert>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 py-16 text-center">
        <h1 className="font-display text-xl font-semibold text-[var(--foreground)]">Rejoindre {invitation.tontine.name}</h1>
        <p className="text-stone-600">
          {invitation.invitedBy.fullName} vous invite à rejoindre cette tontine sur Tontine CI.
          Connectez-vous ou créez un compte pour continuer.
        </p>
        <div className="flex justify-center gap-3">
          <Link href={`/connexion?next=${encodeURIComponent(next)}`}>
            <Button>Se connecter</Button>
          </Link>
          <Link href={`/inscription?next=${encodeURIComponent(next)}`}>
            <Button variant="outline">Créer un compte</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = invitation.expiresAt < new Date();
  const isUsable = invitation.status === "PENDING" && !isExpired;

  if (!isUsable) {
    redirect(invitation.status === "ACCEPTED" ? `/tontines/${invitation.tontineId}` : "/tontines");
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle>Rejoindre {invitation.tontine.name}</CardTitle>
          <CardDescription>
            Invité par {invitation.invitedBy.fullName}, rôle proposé : {invitation.role}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationButton code={code} />
        </CardContent>
      </Card>
    </div>
  );
}
