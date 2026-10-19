import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TontineLogo } from "@/components/brand/logo";

const PROBLEMS = [
  "Suivi des cotisations de chaque membre, tour par tour",
  "Rappels des échéances de paiement",
  "Transparence totale sur l'argent collecté et reversé",
  "Historique fiable, fini les cahiers et les groupes WhatsApp perdus",
  "Gestion simple même entre membres dans plusieurs pays",
];

const TYPES = [
  { title: "Tontine rotative classique", desc: "Cotisation fixe, un bénéficiaire par tour, calendrier automatique." },
  { title: "Épargne collective", desc: "Suivi de l'épargne du groupe, objectifs et dépenses autorisées." },
  { title: "Cotisations variables", desc: "Montant minimum, recommandé, et contributions exceptionnelles." },
  { title: "Tontine solidaire", desc: "Campagnes pour un mariage, une naissance, un soutien ponctuel." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <TontineLogo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/connexion">
            <Button variant="ghost">Connexion</Button>
          </Link>
          <Link href="/inscription">
            <Button>Créer un compte</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Gérez vos tontines en toute confiance
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
          Cotisations, calendrier des tours, paiements et rapports : tout au même endroit, en
          franc CFA, accessible depuis la Côte d&apos;Ivoire comme depuis la diaspora.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/inscription">
            <Button size="lg">Commencer gratuitement</Button>
          </Link>
          <Link href="/connexion">
            <Button size="lg" variant="outline">
              J&apos;ai déjà un compte
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-center text-2xl font-semibold text-[var(--foreground)]">
          Les problèmes que Tontine CI résout
        </h2>
        <ul className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
          {PROBLEMS.map((p) => (
            <li key={p} className="flex items-start gap-2 rounded-lg bg-white p-4 text-sm text-stone-700 shadow-sm">
              <span className="mt-0.5 text-accent">●</span>
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-center text-2xl font-semibold text-[var(--foreground)]">Types de tontines prises en charge</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TYPES.map((t) => (
            <Card key={t.title}>
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        <p>Tontine CI — outil de gestion et de traçabilité. Ne détient ni ne transfère vos fonds.</p>
        <p className="mt-2 flex items-center justify-center gap-3">
          <Link href="/cgu" className="hover:text-brand hover:underline">
            Conditions d&apos;utilisation
          </Link>
          <span aria-hidden>·</span>
          <Link href="/confidentialite" className="hover:text-brand hover:underline">
            Politique de confidentialité
          </Link>
        </p>
      </footer>
    </div>
  );
}
