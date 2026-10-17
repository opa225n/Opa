"use client";
import { useEffect, useState } from "react";
import { adminApi, getAdminProfile } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { formatDateTime, formatFcfa } from "@/lib/format";

interface Correction {
  id: string;
  tontineName: string;
  originalTxId: string;
  reason: string;
  correctedLines: { account: string; debit: number; credit: number; reason: string }[];
  status: string;
  proposedByName: string;
  approvedByName?: string;
  createdAt: string;
}

interface TontineOption { id: string; name: string }
interface LedgerTx { txId: string; createdAt: string; reason: string; lines: { account: string; debit: number; credit: number }[] }

export default function LedgerCorrectionsPage() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const myEmail = getAdminProfile()?.email;

  function load() {
    adminApi.get("/ledger-corrections").then(setCorrections);
  }
  useEffect(load, []);

  async function approve(id: string) {
    try {
      await adminApi.post(`/ledger-corrections/${id}/approve`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }
  async function reject(id: string) {
    await adminApi.post(`/ledger-corrections/${id}/reject`);
    load();
  }

  return (
    <div>
      <h1 className="page-title">Corrections du grand livre</h1>
      <p className="page-subtitle">
        Toute correction nécessite l'approbation d'un <strong>second</strong> administrateur, différent de celui qui
        l'a proposée. Les écritures d'origine ne sont jamais modifiées : la correction écrit une annulation puis la
        version corrigée.
      </p>

      <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: 20 }}>
        + Proposer une correction
      </button>

      {corrections.length === 0 ? (
        <div className="empty">Aucune correction proposée.</div>
      ) : (
        corrections.map((c) => (
          <div className="card" key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{c.tontineName}</h3>
                <p className="muted mono" style={{ fontSize: 12 }}>tx : {c.originalTxId}</p>
              </div>
              <Badge status={c.status} />
            </div>
            <p style={{ margin: "10px 0" }}>{c.reason}</p>
            <table style={{ marginBottom: 10 }}>
              <thead><tr><th>Compte</th><th>Débit</th><th>Crédit</th></tr></thead>
              <tbody>
                {c.correctedLines.map((l, i) => (
                  <tr key={i}><td className="mono">{l.account}</td><td>{formatFcfa(l.debit)}</td><td>{formatFcfa(l.credit)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 13 }}>
              Proposée par {c.proposedByName} le {formatDateTime(c.createdAt)}
              {c.approvedByName && ` · traitée par ${c.approvedByName}`}
            </p>
            {c.status === "pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={() => approve(c.id)} disabled={c.proposedByName === getAdminProfile()?.fullName}>
                  Approuver (2e admin)
                </button>
                <button className="btn btn-secondary" onClick={() => reject(c.id)}>Rejeter</button>
              </div>
            )}
          </div>
        ))
      )}

      {showForm && <CorrectionForm onDone={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}
    </div>
  );
}

function CorrectionForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [tontines, setTontines] = useState<TontineOption[]>([]);
  const [tontineId, setTontineId] = useState("");
  const [txs, setTxs] = useState<LedgerTx[]>([]);
  const [txId, setTxId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState([
    { account: "", debit: 0, credit: 0, reason: "" },
    { account: "", debit: 0, credit: 0, reason: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.get("/tontines").then((rows) => setTontines(rows.map((r: any) => ({ id: r.id, name: r.name }))));
  }, []);

  useEffect(() => {
    if (!tontineId) return setTxs([]);
    adminApi.get(`/tontines/${tontineId}/ledger-transactions`).then(setTxs);
  }, [tontineId]);

  function updateLine(i: number, field: string, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: field === "account" || field === "reason" ? value : Number(value) || 0 } : l)));
  }

  async function submit() {
    setError(null);
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (totalDebit !== totalCredit) {
      setError("Les lignes corrigées doivent être équilibrées (débit = crédit).");
      return;
    }
    if (!tontineId || !txId || reason.trim().length < 5) {
      setError("Tontine, transaction et motif sont requis.");
      return;
    }
    try {
      await adminApi.post("/ledger-corrections", {
        tontineId,
        originalTxId: txId,
        reason,
        correctedLines: lines.filter((l) => l.account),
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Proposer une correction</h3>
        {error && <div className="error-text">{error}</div>}
        <div className="field">
          <label>Tontine</label>
          <select value={tontineId} onChange={(e) => { setTontineId(e.target.value); setTxId(""); }}>
            <option value="">— Choisir —</option>
            {tontines.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {tontineId && (
          <div className="field">
            <label>Transaction d'origine</label>
            <select value={txId} onChange={(e) => setTxId(e.target.value)}>
              <option value="">— Choisir —</option>
              {txs.map((tx) => (
                <option key={tx.txId} value={tx.txId}>
                  {new Date(tx.createdAt).toLocaleString("fr-FR")} — {tx.reason}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Motif de la correction</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez pourquoi cette écriture est incorrecte…" />
        </div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Lignes corrigées (débit = crédit)</label>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginTop: 8 }}>
            <input placeholder="compte" value={l.account} onChange={(e) => updateLine(i, "account", e.target.value)} />
            <input placeholder="débit" type="number" value={l.debit || ""} onChange={(e) => updateLine(i, "debit", e.target.value)} />
            <input placeholder="crédit" type="number" value={l.credit || ""} onChange={(e) => updateLine(i, "credit", e.target.value)} />
          </div>
        ))}
        <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setLines((p) => [...p, { account: "", debit: 0, credit: 0, reason: "" }])}>
          + Ajouter une ligne
        </button>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={submit}>Proposer</button>
          <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
