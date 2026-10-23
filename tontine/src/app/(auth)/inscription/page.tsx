import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-2xl font-bold text-[var(--brand)]">Créer votre compte</h1>
      <p className="text-sm text-stone-500">
        Cotisations, calendrier des tours, paiements et rapports : tout au même endroit, en
        franc CFA, accessible depuis la Côte d&apos;Ivoire comme depuis la diaspora.
      </p>

      <div className="mt-4">
        <Suspense>
          <SignUpForm />
        </Suspense>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs text-stone-400">Ou</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <Link href="/connexion" className="mt-2">
        <Button type="button" variant="outline" size="lg" className="w-full rounded-full">
          <ChevronLeft className="h-4 w-4" /> Se connecter
        </Button>
      </Link>

      <p className="mt-4 text-center text-xs text-stone-400">
        Besoin d&apos;aide ? <span className="font-medium text-[var(--brand)]">Contactez-nous</span>
      </p>
    </div>
  );
}
