import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JoinCodeForm } from "./join-code-form";

export default function JoinWithCodePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Rejoindre une tontine</CardTitle>
          <CardDescription>
            Entrez le code d&apos;invitation que le responsable de la tontine vous a transmis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinCodeForm />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-stone-600">
        Pas encore de code ?{" "}
        <Link href="/tontines/nouveau" className="font-medium text-brand underline-offset-4 hover:underline">
          Créez votre propre tontine
        </Link>
      </p>
    </div>
  );
}
