"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatDate, formatFcfa } from "@/lib/format";

interface Reconciliation {
  byAccount: { account: string; debit: number; credit: number; balance: number }[];
  providerClearingByDay: { day: string; debit: number; credit: number; balance: number }[];
}

export default function ReconciliationPage() {
  const [data, setData] = useState<Reconciliation | null>(null);

  useEffect(() => {
    adminApi.get("/payments/reconciliation").then(setData);
  }, []);

  if (!data) return <div className="empty">Chargement…</div>;

  const clearing = data.byAccount.find((a) => a.account === "provider_clearing");

  return (
    <div>
      <h1 className="page-title">Rapprochement</h1>
      <p className="page-subtitle">
        Le compte <span className="mono">provider_clearing</span> doit revenir à zéro une fois les versements
        effectués (cf. TRD). Un solde non nul correspond aux frais retenus ou à des paiements en cours.
      </p>

      <div className="kpi-grid">
        <div className={`kpi-card ${clearing && clearing.balance !== 0 ? "" : ""}`}>
          <div className="value">{clearing ? formatFcfa(clearing.balance) : "—"}</div>
          <div className="label">Solde provider_clearing (global)</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Solde par compte du grand livre</h3>
        <table>
          <thead><tr><th>Compte</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead>
          <tbody>
            {data.byAccount.map((a) => (
              <tr key={a.account}>
                <td className="mono">{a.account}</td>
                <td>{formatFcfa(a.debit)}</td>
                <td>{formatFcfa(a.credit)}</td>
                <td style={{ fontWeight: 600, color: a.balance === 0 ? "var(--color-success)" : "var(--color-warning)" }}>{formatFcfa(a.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>provider_clearing — 30 derniers jours</h3>
        {data.providerClearingByDay.length === 0 ? (
          <div className="muted">Aucune donnée.</div>
        ) : (
          <table>
            <thead><tr><th>Jour</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead>
            <tbody>
              {data.providerClearingByDay.map((d) => (
                <tr key={d.day}>
                  <td>{formatDate(d.day)}</td>
                  <td>{formatFcfa(d.debit)}</td>
                  <td>{formatFcfa(d.credit)}</td>
                  <td style={{ fontWeight: 600 }}>{formatFcfa(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
