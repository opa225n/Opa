import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RequestResetForm } from "./request-reset-form";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Indiquez le numéro de téléphone de votre compte pour recevoir un lien de
          réinitialisation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RequestResetForm />
        <p className="mt-4 text-center text-sm text-stone-600">
          <Link href="/connexion" className="font-medium text-brand underline-offset-4 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
