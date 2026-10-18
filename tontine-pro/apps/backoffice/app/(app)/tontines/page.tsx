"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { formatDate, formatFcfa } from "@/lib/format";

interface TontineRow {
  id: string;
  name: string;
  status: string;
  suspendedAt: string | null;
  memberCount: number;
  contributionAmount: number;
  frequency: string;
  createdBy: string;
  createdAt: string;
}

export default function TontinesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<TontineRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    adminApi
      .get(`/tontines${params.toString() ? `?${params}` : ""}`)
      .then(setRows)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <h1 className="page-title">Tontines</h1>
      <p className="page-subtitle">{rows.length} résultat(s)</p>

      <div className="toolbar">
        <input placeholder="Rechercher par nom…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} style={{ width: 240 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="active">Active</option>
          <option value="completed">Terminée</option>
          <option value="cancelled">Annulée</option>
        </select>
        <button className="btn btn-secondary" onClick={load}>Filtrer</button>
      </div>

      {loading ? (
        <div className="empty">Chargement…</div>
      ) : (
        <DataTable<TontineRow>
          onRowClick={(row) => router.push(`/tontines/${row.id}`)}
          emptyLabel="Aucune tontine."
          columns={[
            { key: "name", label: "Nom", sortable: true, sortValue: (r) => r.name },
            { key: "memberCount", label: "Membres", sortable: true, sortValue: (r) => r.memberCount },
            { key: "contributionAmount", label: "Cotisation", sortable: true, sortValue: (r) => r.contributionAmount, render: (r) => formatFcfa(r.contributionAmount) },
            { key: "createdBy", label: "Créée par", sortable: true, sortValue: (r) => r.createdBy },
            {
              key: "status",
              label: "Statut",
              sortable: true,
              sortValue: (r) => r.status,
              render: (r) => (
                <>
                  <Badge status={r.status} /> {r.suspendedAt && <span className="badge badge-error" style={{ marginLeft: 6 }}>Suspendue</span>}
                </>
              ),
            },
            { key: "createdAt", label: "Créée le", sortable: true, sortValue: (r) => r.createdAt, render: (r) => formatDate(r.createdAt) },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
