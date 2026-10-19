import Link from "next/link";
import { getTontineContext } from "@/lib/get-tontine-context";
import { Badge } from "@/components/ui/badge";
import { TONTINE_STATUS_LABELS, MEMBER_ROLE_LABELS } from "@/lib/labels";

const TABS = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/membres", label: "Membres" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/cotisations", label: "Cotisations" },
  { href: "/operations", label: "Opérations" },
  { href: "/rapports", label: "Rapports" },
  { href: "/reglement", label: "Règlement" },
];

export default async function TontineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tontine, membership } = await getTontineContext(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{tontine.name}</h1>
          {tontine.description && <p className="text-sm text-stone-500">{tontine.description}</p>}
        </div>
        <div className="flex gap-2">
          <Badge variant={tontine.status === "ACTIVE" ? "default" : "neutral"}>
            {TONTINE_STATUS_LABELS[tontine.status]}
          </Badge>
          <Badge variant="outline">{MEMBER_ROLE_LABELS[membership.role]}</Badge>
          {tontine.isDemo && <Badge variant="warning">Données de démonstration</Badge>}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/tontines/${id}${tab.href}`}
            className="whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-brand"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
