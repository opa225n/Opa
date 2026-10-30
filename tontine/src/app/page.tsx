import Link from "next/link";
import { TontineMark } from "@/components/brand/logo";
import { InstallAppButton } from "@/components/pwa/install-app-button";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-[var(--brand)] px-6 py-10 text-center text-white">
      <TontineMark
        size={480}
        monochrome
        className="pointer-events-none absolute -bottom-24 -right-24 text-white/5"
      />

      <div aria-hidden className="h-8" />

      <div className="relative flex flex-col items-center gap-5">
        <TontineMark size={140} />
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight">
            Tontine CI
          </h1>
          <p className="mt-1 text-sm font-medium tracking-wide text-[var(--brand-gold)]">
            Ensemble pour demain
          </p>
        </div>
        <p className="max-w-xs text-balance text-base text-white/80">
          Plus qu&apos;une tontine, une communauté qui avance ensemble.
        </p>
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/inscription"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--brand-gold)] text-base font-semibold text-[var(--brand)] transition hover:brightness-95"
        >
          Commencer
        </Link>
        <p className="text-sm text-white/70">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-medium text-[var(--brand-gold)] underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      </div>

      <div className="relative mt-2">
        <InstallAppButton />
      </div>
    </main>
  );
}
