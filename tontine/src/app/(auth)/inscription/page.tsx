import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer votre compte</CardTitle>
        <CardDescription>
          Rejoignez une tontine ou créez la vôtre en quelques étapes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <SignUpForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-stone-600">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-medium text-brand underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
