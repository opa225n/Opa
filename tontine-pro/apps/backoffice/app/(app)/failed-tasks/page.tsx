"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatDateTime, formatFcfa } from "@/lib/format";

interface FailedTasks {
  failedPayments: { id: string; amount: number; updatedAt: string; memberName: string | null; tontineName: string | null }[];
  failedPayouts: { id: string; amount: number; attempts: number; beneficiaryName: string; tontineName: string; roundNumber: number }[];
}

export default function FailedTasksPage() {
  const [data, setData] = useState<FailedTasks | null>(null);

  function load() {
    adminApi.get("/payments/failed-tasks").then(setData);
  }
  useEffect(load, []);

  async function retry(payoutId: string) {
    await adminApi.post(`/payments/payouts/${payoutId}/retry`);
    load();
  }

  if (!data) return <div className="empty">Chargement…</div>;

  return (
    <div>
      <h1 className="page-title">Tâches en échec</h1>
      <p className="page-subtitle">Paiements et versements qui n'ont pas abouti et nécessitent une action.</p>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Versements en échec ({data.failedPayouts.length})</h3>
        {data.failedPayouts.length === 0 ? (
          <div className="muted">Aucun versement en échec.</div>
        ) : (
          <table>
            <thead><tr><th>Tontine</th><th>Tour</th><th>Bénéficiaire</th><th>Montant</th><th>Tentatives</th><th></th></tr></thead>
            <tbody>
              {data.failedPayouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.tontineName}</td>
                  <td>{p.roundNumber}</td>
                  <td>{p.beneficiaryName}</td>
                  <td>{formatFcfa(p.amount)}</td>
                  <td>{p.attempts}</td>
                  <td><button className="btn btn-primary" onClick={() => retry(p.id)}>Relancer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Paiements en échec ({data.failedPayments.length})</h3>
        {data.failedPayments.length === 0 ? (
          <div className="muted">Aucun paiement en échec.</div>
        ) : (
          <table>
            <thead><tr><th>Membre</th><th>Tontine</th><th>Montant</th><th>Date</th></tr></thead>
            <tbody>
              {data.failedPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.memberName}</td>
                  <td>{p.tontineName}</td>
                  <td>{formatFcfa(p.amount)}</td>
                  <td>{formatDateTime(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
