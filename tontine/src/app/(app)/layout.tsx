import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TontineLogo } from "@/components/brand/logo";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { PhoneVerificationGate } from "@/components/phone-verification/phone-verification-gate";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/tontines", label: "Mes tontines" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profil", label: "Profil" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  const isPlatformAdmin =
    (session.user as typeof session.user & { platformRole?: string }).platformRole === "ADMIN";
  const nav = isPlatformAdmin ? [...NAV, { href: "/admin", label: "Administration" }] : NAV;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingSeenAt: true, phoneVerified: true, phone: true },
  });

  if (currentUser && !currentUser.phoneVerified) {
    return <PhoneVerificationGate phone={currentUser.phone} />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="shrink-0">
            <TontineLogo size="md" className="hidden sm:inline-flex" />
            <TontineLogo size="md" variant="compact" className="sm:hidden" />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-stone-600 sm:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ))}
          </nav>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Déconnexion
            </Button>
          </form>
        </div>
        <nav className="flex items-center gap-4 overflow-x-auto border-t border-stone-100 px-4 py-2 text-sm font-medium text-stone-600 sm:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-brand">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      {!currentUser?.onboardingSeenAt && <OnboardingTour />}
    </div>
  );
}
