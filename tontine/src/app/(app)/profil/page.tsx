import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UpdateProfileForm, ChangePasswordForm, DeactivateAccountButton } from "./profile-forms";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: { profile: true },
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
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
          <CardTitle>Sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Les notifications dans l&apos;application sont toujours actives. L&apos;envoi par SMS et
            WhatsApp nécessite la configuration d&apos;un fournisseur côté serveur (non activé en
            environnement de démonstration).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone de danger</CardTitle>
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
