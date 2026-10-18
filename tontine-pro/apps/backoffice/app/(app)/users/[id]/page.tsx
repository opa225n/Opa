"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatDateTime } from "@/lib/format";

interface UserDetail {
  id: string;
  phone: string;
  fullName: string;
  momoNumber: string | null;
  momoOperator: string | null;
  status: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  memberships: { tontineId: string; tontineName: string; role: string; status: string }[];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [showModal, setShowModal] = useState(false);

  function load() {
    adminApi.get(`/users/${id}`).then(setUser);
  }

  useEffect(load, [id]);

  async function suspend(reason: string) {
    await adminApi.post(`/users/${id}/suspend`, { reason });
    setShowModal(false);
    load();
  }

  async function unsuspend() {
    await adminApi.post(`/users/${id}/unsuspend`);
    load();
  }

  if (!user) return <div className="empty">Chargement…</div>;

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => router.push("/users")} style={{ marginBottom: 16 }}>
        ← Utilisateurs
      </button>
      <h1 className="page-title">{user.fullName || "Sans nom"}</h1>
      <p className="page-subtitle">{user.phone}</p>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
          <div><span className="muted">Statut : </span><Badge status={user.status} /></div>
          <div><span className="muted">Inscrit le : </span>{formatDateTime(user.createdAt)}</div>
          <div><span className="muted">Mobile Money : </span>{user.momoNumber || "—"} ({user.momoOperator || "—"})</div>
        </div>
        {user.status === "suspended" && (
          <div className="banner-like" style={{ marginTop: 12, fontSize: 13 }}>
            <span className="muted">Motif de suspension : </span>
            {user.suspendedReason}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          {user.status === "suspended" ? (
            <button className="btn btn-primary" onClick={unsuspend}>Réactiver le compte</button>
          ) : (
            <button className="btn btn-danger" onClick={() => setShowModal(true)}>Suspendre le compte</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Tontines ({user.memberships.length})</h3>
        {user.memberships.length === 0 ? (
          <div className="muted">Aucune tontine.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tontine</th>
                <th>Rôle</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {user.memberships.map((m) => (
                <tr key={m.tontineId} className="clickable" onClick={() => router.push(`/tontines/${m.tontineId}`)}>
                  <td>{m.tontineName}</td>
                  <td>{m.role}</td>
                  <td><Badge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ConfirmModal
          title="Suspendre ce compte ?"
          body="L'utilisateur perdra immédiatement l'accès à l'application."
          confirmLabel="Suspendre"
          danger
          onConfirm={suspend}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
