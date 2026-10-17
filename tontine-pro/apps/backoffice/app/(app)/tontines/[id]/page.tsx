"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatDate, formatFcfa } from "@/lib/format";

interface TontineDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  contributionAmount: number;
  frequency: string;
  createdBy: string;
  createdAt: string;
  members: { id: string; name: string; phone: string; role: string; status: string }[];
  rounds: { roundNumber: number; status: string; dueDate: string; potAmount: number }[];
  ledgerBalance: { account: string; debit: number; credit: number; balance: number }[];
}

export default function TontineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tontine, setTontine] = useState<TontineDetail | null>(null);
  const [showModal, setShowModal] = useState(false);

  function load() {
    adminApi.get(`/tontines/${id}`).then(setTontine);
  }
  useEffect(load, [id]);

  async function suspend(reason: string) {
    await adminApi.post(`/tontines/${id}/suspend`, { reason });
    setShowModal(false);
    load();
  }
  async function unsuspend() {
    await adminApi.post(`/tontines/${id}/unsuspend`);
    load();
  }

  if (!tontine) return <div className="empty">Chargement…</div>;

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => router.push("/tontines")} style={{ marginBottom: 16 }}>
        ← Tontines
      </button>
      <h1 className="page-title">{tontine.name}</h1>
      <p className="page-subtitle">
        Créée par {tontine.createdBy} le {formatDate(tontine.createdAt)}
      </p>

      <div className="card">
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <Badge status={tontine.status} />
          {tontine.suspendedAt && <span className="badge badge-error">Suspendue</span>}
          <span>{formatFcfa(tontine.contributionAmount)} / {tontine.frequency}</span>
        </div>
        {tontine.suspendedReason && (
          <p style={{ marginTop: 10, fontSize: 13 }}>
            <span className="muted">Motif : </span>
            {tontine.suspendedReason}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          {tontine.suspendedAt ? (
            <button className="btn btn-primary" onClick={unsuspend}>Lever la suspension</button>
          ) : (
            <button className="btn btn-danger" onClick={() => setShowModal(true)}>Suspendre la tontine</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Membres ({tontine.members.length})</h3>
        <table>
          <thead>
            <tr><th>Nom</th><th>Téléphone</th><th>Rôle</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {tontine.members.map((m) => (
              <tr key={m.id} className="clickable">
                <td>{m.name}</td><td>{m.phone}</td><td>{m.role}</td><td><Badge status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Tours</h3>
        <table>
          <thead><tr><th>N°</th><th>Échéance</th><th>Pot</th><th>Statut</th></tr></thead>
          <tbody>
            {tontine.rounds.map((r) => (
              <tr key={r.roundNumber}>
                <td>{r.roundNumber}</td><td>{formatDate(r.dueDate)}</td><td>{formatFcfa(r.potAmount)}</td><td><Badge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Solde du grand livre</h3>
        <table>
          <thead><tr><th>Compte</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead>
          <tbody>
            {tontine.ledgerBalance.map((l) => (
              <tr key={l.account}>
                <td className="mono">{l.account}</td>
                <td>{formatFcfa(l.debit)}</td>
                <td>{formatFcfa(l.credit)}</td>
                <td style={{ fontWeight: 600, color: l.balance === 0 ? "var(--color-success)" : "var(--color-warning)" }}>{formatFcfa(l.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ConfirmModal
          title="Suspendre cette tontine ?"
          body="Les membres ne pourront plus cotiser tant que la suspension est active."
          confirmLabel="Suspendre"
          danger
          onConfirm={suspend}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
