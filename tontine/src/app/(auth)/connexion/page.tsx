import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Accédez à vos tontines.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <SignInForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-stone-600">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
