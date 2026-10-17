"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatDateTime } from "@/lib/format";

interface Dispute {
  id: string;
  tontineId: string;
  tontineName: string;
  raisedByName: string;
  contributionId: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  resolvedByName?: string;
  createdAt: string;
  resolvedAt: string | null;
}

export default function DisputesPage() {
  const [status, setStatus] = useState("open");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [resolving, setResolving] = useState<{ dispute: Dispute; outcome: "resolved" | "dismissed" } | null>(null);

  function load() {
    adminApi.get(`/disputes?status=${status}`).then(setDisputes);
  }
  useEffect(load, [status]);

  async function resolve(reason: string) {
    if (!resolving) return;
    await adminApi.post(`/disputes/${resolving.dispute.id}/resolve`, { outcome: resolving.outcome, resolution: reason });
    setResolving(null);
    load();
  }

  return (
    <div>
      <h1 className="page-title">Litiges</h1>
      <p className="page-subtitle">Signalements remontés par les membres (écran « Aide et signalement »).</p>

      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Ouverts</option>
          <option value="resolved">Résolus</option>
          <option value="dismissed">Rejetés</option>
          <option value="all">Tous</option>
        </select>
      </div>

      {disputes.length === 0 ? (
        <div className="empty">Aucun litige.</div>
      ) : (
        disputes.map((d) => (
          <div className="card" key={d.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{d.tontineName}</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  Signalé par {d.raisedByName} — {formatDateTime(d.createdAt)}
                </p>
              </div>
              <Badge status={d.status} />
            </div>
            <p style={{ margin: "12px 0" }}>{d.reason}</p>
            {d.resolution && (
              <p className="muted" style={{ fontSize: 13 }}>
                Résolution ({d.resolvedByName}) : {d.resolution}
              </p>
            )}
            {d.status === "open" && (
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={() => setResolving({ dispute: d, outcome: "resolved" })}>
                  Marquer comme résolu
                </button>
                <button className="btn btn-secondary" onClick={() => setResolving({ dispute: d, outcome: "dismissed" })}>
                  Rejeter
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {resolving && (
        <ConfirmModal
          title={resolving.outcome === "resolved" ? "Résoudre ce litige" : "Rejeter ce litige"}
          body="Expliquez la décision prise : elle sera consultable dans le journal admin."
          confirmLabel={resolving.outcome === "resolved" ? "Marquer résolu" : "Rejeter"}
          onConfirm={resolve}
          onCancel={() => setResolving(null)}
        />
      )}
    </div>
  );
}
