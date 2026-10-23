import { headers } from "next/headers";
import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { MemberOrderList } from "./member-order-list";
import { revokeInvitationAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";

async function getAppUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tontine, user, membership } = await getTontineContext(id);

  const [memberships, invitations, appUrl] = await Promise.all([
    prisma.tontineMembership.findMany({
      where: { tontineId: id, status: "ACTIVE" },
      include: { user: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.invitation.findMany({
      where: { tontineId: id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    getAppUrl(),
  ]);

  const canManage = ["RESPONSABLE", "SECRETAIRE"].includes(membership.role);
  const canReorder = membership.role === "RESPONSABLE" && tontine.status === "DRAFT";

  const memberRows = memberships.map((m) => ({
    id: m.id,
    role: m.role,
    fullName: m.user.fullName,
    phone: m.user.phone,
    isSelf: m.userId === user.id,
    bras: m.bras,
  }));
  const canEditBras = membership.role === "RESPONSABLE";

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Inviter un membre</CardTitle>
            <CardDescription>
              Génère un lien à usage unique, valable 7 jours. La personne doit créer un compte ou
              se connecter pour rejoindre la tontine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm tontineId={id} appUrl={appUrl} />
          </CardContent>
        </Card>
      )}

      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <div>
                  <span className="font-mono">{inv.code}</span>
                  {inv.phone && <span className="ml-2 text-stone-500">{inv.phone}</span>}
                  <Badge variant="outline" className="ml-2">
                    {inv.role}
                  </Badge>
                  <span className="ml-2 text-stone-400">
                    expire le {inv.expiresAt.toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await revokeInvitationAction(inv.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                    Annuler
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membres ({memberships.length})</CardTitle>
          <CardDescription>
            {canReorder
              ? "Ordre des bénéficiaires : utilisez les flèches pour réorganiser avant de démarrer la tontine."
              : "Ordre des bénéficiaires, verrouillé depuis le démarrage de la tontine."}
            {canEditBras &&
              " Un membre à plusieurs bras cotise N fois le montant de base à chaque tour, mais ne reçoit qu'un seul tour."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberOrderList
            tontineId={id}
            initialMembers={memberRows}
            canManage={canManage && tontine.status === "DRAFT"}
            canReorder={canReorder}
            canEditBras={canEditBras}
          />
        </CardContent>
      </Card>
    </div>
  );
}
