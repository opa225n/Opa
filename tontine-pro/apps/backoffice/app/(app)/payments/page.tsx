"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { formatDateTime, formatFcfa } from "@/lib/format";

interface PaymentRow {
  id: string;
  direction: string;
  status: string;
  provider: string;
  providerRef: string | null;
  operator: string | null;
  amount: number;
  fee: number;
  createdAt: string;
  updatedAt: string;
  memberName: string | null;
  tontineName: string | null;
}

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (direction) params.set("direction", direction);
    adminApi.get(`/payments${params.toString() ? `?${params}` : ""}`).then(setRows).finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <h1 className="page-title">Paiements</h1>
      <p className="page-subtitle">{rows.length} résultat(s) — cotisations entrantes et versements sortants.</p>

      <div className="toolbar">
        <select value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="">Toutes directions</option>
          <option value="in">Cotisation (entrant)</option>
          <option value="out">Versement (sortant)</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="initiated">Initié</option>
          <option value="pending">En attente</option>
          <option value="succeeded">Réussi</option>
          <option value="failed">Échoué</option>
        </select>
        <button className="btn btn-secondary" onClick={load}>Filtrer</button>
      </div>

      {loading ? (
        <div className="empty">Chargement…</div>
      ) : (
        <DataTable<PaymentRow>
          emptyLabel="Aucun paiement."
          columns={[
            { key: "direction", label: "Sens", sortable: true, sortValue: (r) => r.direction, render: (r) => (r.direction === "in" ? "Cotisation" : "Versement") },
            { key: "memberName", label: "Membre", sortable: true, sortValue: (r) => r.memberName || "" },
            { key: "tontineName", label: "Tontine", sortable: true, sortValue: (r) => r.tontineName || "" },
            { key: "amount", label: "Montant", sortable: true, sortValue: (r) => r.amount, render: (r) => formatFcfa(r.amount) },
            { key: "operator", label: "Opérateur", sortable: true, sortValue: (r) => r.operator || r.provider, render: (r) => r.operator || r.provider },
            { key: "status", label: "Statut", sortable: true, sortValue: (r) => r.status, render: (r) => <Badge status={r.status} /> },
            { key: "updatedAt", label: "Mis à jour", sortable: true, sortValue: (r) => r.updatedAt, render: (r) => formatDateTime(r.updatedAt) },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
