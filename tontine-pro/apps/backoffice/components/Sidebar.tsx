"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminSession, getAdminProfile } from "@/lib/api";

const ITEMS = [
  { href: "/", label: "Tableau de bord", icon: "📊" },
  { href: "/users", label: "Utilisateurs", icon: "👤" },
  { href: "/tontines", label: "Tontines", icon: "🤝" },
  { href: "/payments", label: "Paiements", icon: "💳" },
  { href: "/reconciliation", label: "Rapprochement", icon: "⚖️" },
  { href: "/disputes", label: "Litiges", icon: "🚩" },
  { href: "/failed-tasks", label: "Tâches en échec", icon: "⚠️" },
  { href: "/ledger-corrections", label: "Corrections du grand livre", icon: "🧾" },
  { href: "/audit-log", label: "Journal admin", icon: "📜" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = getAdminProfile();

  function logout() {
    clearAdminSession();
    router.push("/login");
  }

  return (
    <aside className="sidebar">
      <div className="brand">🤝 Tontine Admin</div>
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
      <div className="admin-footer">
        <div>{admin?.fullName}</div>
        <div style={{ opacity: 0.8 }}>{admin?.email}</div>
        <button
          onClick={logout}
          style={{ background: "none", border: "none", color: "#cfe8d9", cursor: "pointer", padding: 0, marginTop: 8, fontSize: 12, textDecoration: "underline" }}
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
