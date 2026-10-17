"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

interface UserRow {
  id: string;
  phone: string;
  fullName: string;
  status: string;
  membershipCount: number;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load(query: string) {
    setLoading(true);
    adminApi
      .get(`/users${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <div>
      <h1 className="page-title">Utilisateurs</h1>
      <p className="page-subtitle">{users.length} résultat(s)</p>

      <div className="toolbar">
        <input
          placeholder="Rechercher par nom ou numéro…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          style={{ width: 280 }}
        />
        <button className="btn btn-secondary" onClick={() => load(q)}>
          Rechercher
        </button>
      </div>

      {loading ? (
        <div className="empty">Chargement…</div>
      ) : (
        <DataTable<UserRow>
          onRowClick={(row) => router.push(`/users/${row.id}`)}
          emptyLabel="Aucun utilisateur."
          columns={[
            { key: "fullName", label: "Nom", sortable: true, sortValue: (r) => r.fullName || r.phone, render: (r) => r.fullName || <span className="muted">Sans nom</span> },
            { key: "phone", label: "Téléphone", sortable: true, sortValue: (r) => r.phone },
            { key: "membershipCount", label: "Tontines", sortable: true, sortValue: (r) => r.membershipCount },
            { key: "status", label: "Statut", sortable: true, sortValue: (r) => r.status, render: (r) => <Badge status={r.status} /> },
            { key: "createdAt", label: "Inscrit le", sortable: true, sortValue: (r) => r.createdAt, render: (r) => formatDate(r.createdAt) },
          ]}
          rows={users}
        />
      )}
    </div>
  );
}
