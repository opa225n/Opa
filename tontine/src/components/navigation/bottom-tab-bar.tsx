"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Plus, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: Home, isAction: false },
  { href: "/calendrier", label: "Calendrier", icon: Calendar, isAction: false },
  { href: "/tontines/nouveau", label: "", icon: Plus, isAction: true },
  { href: "/tontines", label: "Tontines", icon: Users, isAction: false },
  { href: "/profil", label: "Profil", icon: User, isAction: false },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-stone-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden"
      aria-label="Navigation principale"
    >
      {TABS.map((tab) => {
        const active = tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        if (tab.isAction) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label="Créer une tontine"
              className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-[var(--brand-gold)] text-[var(--brand)] shadow-lg transition-transform active:scale-95"
            >
              <Icon className="h-6 w-6" />
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium",
              active ? "text-[var(--brand)]" : "text-stone-400"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
