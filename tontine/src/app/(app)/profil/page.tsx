import { User as UserIcon, Lock, Bell, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UpdateProfileForm, ChangePasswordForm, DeactivateAccountButton } from "./profile-forms";

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: { profile: true },
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center gap-4 rounded-2xl bg-[var(--brand)] p-5 text-[var(--background)]">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold)] font-display text-xl font-semibold text-[var(--brand)]">
          {getInitials(user.fullName)}
        </span>
        <div>
          <p className="font-display text-lg font-semibold">{user.fullName}</p>
          <p className="text-sm text-[var(--background)]/70">{user.phone}</p>
          <p className="text-xs text-[var(--background)]/60">
            Membre depuis {user.createdAt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-[var(--brand-gold)]" /> Informations personnelles
          </CardTitle>
          <CardDescription>Numéro : {user.phone} (non modifiable)</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm
            initial={{
              fullName: user.fullName,
              email: user.email ?? "",
              address: user.profile?.address ?? "",
              city: user.profile?.city ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--brand-gold)]" /> Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--brand-gold)]" /> Notifications
          </CardTitle>
          <CardDescription>
            Les notifications dans l&apos;application sont toujours actives. L&apos;envoi par SMS et
            WhatsApp nécessite la configuration d&apos;un fournisseur côté serveur (non activé en
            environnement de démonstration).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-red-200 bg-red-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" /> Zone de danger
          </CardTitle>
          <CardDescription>
            La désactivation est bloquée si vous êtes responsable d&apos;une tontine active : transférez
            le rôle avant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeactivateAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
