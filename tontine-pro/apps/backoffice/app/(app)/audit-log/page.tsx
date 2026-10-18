"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface AuditEntry {
  id: number;
  action: string;
  details: Record<string, unknown>;
  tontineName?: string;
  actorName?: string;
  createdAt: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    adminApi.get("/audit-log").then(setEntries);
  }, []);

  return (
    <div>
      <h1 className="page-title">Journal admin</h1>
      <p className="page-subtitle">Toutes les actions journalisées (membres et équipe interne), écriture seule.</p>

      {entries.length === 0 ? (
        <div className="empty">Aucune entrée.</div>
      ) : (
        <table>
          <thead>
            <tr><th>Date</th><th>Action</th><th>Tontine</th><th>Acteur</th><th>Détails</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{formatDateTime(e.createdAt)}</td>
                <td className="mono">{e.action}</td>
                <td>{e.tontineName || "—"}</td>
                <td>{e.actorName || (e.details as any)?.adminId ? "Admin" : "—"}</td>
                <td className="mono" style={{ fontSize: 12, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {JSON.stringify(e.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
