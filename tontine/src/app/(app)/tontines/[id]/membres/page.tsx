import { headers } from "next/headers";
import { UserPlus, UserCog, Mail, Users, ListOrdered } from "lucide-react";
import { getTontineContext } from "@/lib/get-tontine-context";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { AddManagedMemberForm } from "./add-managed-member-form";
import { ImportMembersForm } from "./import-members-form";
import { CleanupBadImportsButton, MergeBrasButton } from "./cleanup-bad-imports-button";
import { MemberOrderList } from "./member-order-list";
import { GroupsManager } from "./groups-manager";
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

  const [memberships, groups, invitations, appUrl] = await Promise.all([
    prisma.tontineMembership.findMany({
      where: { tontineId: id, status: "ACTIVE" },
      include: { user: { include: { profile: true } } },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.tontineGroup.findMany({
      where: { tontineId: id },
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
  const canEditBras = membership.role === "RESPONSABLE";
  const canManageGroups = membership.role === "RESPONSABLE" && tontine.status === "DRAFT";

  const toRow = (m: (typeof memberships)[number]) => ({
    id: m.id,
    role: m.role,
    fullName: m.user.fullName,
    phone: m.user.phone,
    isSelf: m.userId === user.id,
    bras: m.bras,
    isManaged: m.user.isManaged,
    contactPhone: m.user.profile?.contactPhone ?? null,
    groupId: m.groupId,
  });

  const selectableGroups = groups.map((g) => ({ id: g.id, name: g.name }));
  const groupedSections = groups.map((g) => ({
    group: g,
    rows: memberships.filter((m) => m.groupId === g.id).map(toRow),
  }));
  const ungroupedRows = memberships.filter((m) => !m.groupId).map(toRow);

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--brand-gold)]" /> Inviter un membre
            </CardTitle>
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

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-[var(--brand-gold)]" /> Ajouter un membre sans compte
            </CardTitle>
            <CardDescription>
              Pour un membre sans smartphone/compte : vous gérez entièrement ses cotisations et
              paiements (il ne peut pas se connecter lui-même).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AddManagedMemberForm tontineId={id} />
            <div className="border-t border-stone-100 pt-3">
              <ImportMembersForm tontineId={id} existingNames={memberships.map((m) => m.user.fullName)} />
            </div>
            {membership.role === "RESPONSABLE" && (
              <div className="flex flex-col gap-2 border-t border-stone-100 pt-3">
                <CleanupBadImportsButton tontineId={id} />
                <MergeBrasButton tontineId={id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--brand-gold)]" /> Invitations en attente
            </CardTitle>
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

      {(canManageGroups || groups.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--brand-gold)]" /> Groupes
            </CardTitle>
            <CardDescription>
              Facultatif : répartissez les membres en groupes pour des rotations parallèles
              (chaque groupe a son propre ordre de bénéficiaires et son propre calendrier de
              tours, à la même cotisation). Sans groupe, la tontine fonctionne comme une rotation
              unique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageGroups ? (
              <GroupsManager
                tontineId={id}
                initialGroups={groups.map((g) => ({
                  id: g.id,
                  name: g.name,
                  weekday: g.weekday,
                  memberCount: memberships.filter((m) => m.groupId === g.id).length,
                }))}
                isCustomWeekly={tontine.frequency === "CUSTOM_WEEKLY"}
              />
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-stone-600">
                {groups.map((g) => (
                  <li key={g.id}>
                    {g.name} — {memberships.filter((m) => m.groupId === g.id).length} membre(s)
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {groupedSections.map(({ group, rows }) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-[var(--brand-gold)]" /> Groupe « {group.name} » ({rows.length})
            </CardTitle>
            <CardDescription>
              {canReorder
                ? "Ordre des bénéficiaires de ce groupe : utilisez les flèches pour réorganiser avant de démarrer la tontine."
                : "Ordre des bénéficiaires, verrouillé depuis le démarrage de la tontine."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MemberOrderList
              tontineId={id}
              initialMembers={rows}
              canManage={canManage && tontine.status === "DRAFT"}
              canReorder={canReorder}
              canEditBras={canEditBras}
              groups={selectableGroups}
            />
          </CardContent>
        </Card>
      ))}

      {(groups.length === 0 || ungroupedRows.length > 0) && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-[var(--brand-gold)]" />{" "}
            {groups.length > 0 ? `Sans groupe (${ungroupedRows.length})` : `Membres (${memberships.length})`}
          </CardTitle>
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
            initialMembers={ungroupedRows}
            canManage={canManage && tontine.status === "DRAFT"}
            canReorder={canReorder}
            canEditBras={canEditBras}
            groups={selectableGroups}
          />
        </CardContent>
      </Card>
      )}
    </div>
  );
}
