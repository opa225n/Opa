import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TontineLogo } from "@/components/brand/logo";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { PhoneVerificationGate } from "@/components/phone-verification/phone-verification-gate";
import { BottomTabBar } from "@/components/navigation/bottom-tab-bar";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/calendrier", label: "Calendrier" },
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
    select: { onboardingSeenAt: true, phoneVerified: true, phone: true, email: true },
  });

  if (currentUser && !currentUser.phoneVerified) {
    return <PhoneVerificationGate phone={currentUser.phone} email={currentUser.email} />;
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

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
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative sm:hidden" aria-label="Notifications">
              <Bell className="h-6 w-6 text-stone-600" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
      <BottomTabBar />
      {!currentUser?.onboardingSeenAt && <OnboardingTour />}
    </div>
  );
}
