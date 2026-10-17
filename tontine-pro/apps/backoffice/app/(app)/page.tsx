"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

interface Stats {
  totalUsers: number;
  activeTontines: number;
  draftTontines: number;
  completedTontines: number;
  paymentsConfirmedLast24h: number;
  failedPayments: number;
  failedPayouts: number;
  openDisputes: number;
  pendingLedgerCorrections: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminApi.get("/dashboard").then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="page-title">Tableau de bord</h1>
      <p className="page-subtitle">Vue d'ensemble de la plateforme.</p>

      {!stats ? (
        <div className="empty">Chargement…</div>
      ) : (
        <div className="kpi-grid">
          <Kpi label="Utilisateurs" value={stats.totalUsers} />
          <Kpi label="Tontines actives" value={stats.activeTontines} />
          <Kpi label="Tontines en préparation" value={stats.draftTontines} />
          <Kpi label="Tontines terminées" value={stats.completedTontines} />
          <Kpi label="Paiements confirmés (24h)" value={stats.paymentsConfirmedLast24h} />
          <Kpi label="Paiements en échec" value={stats.failedPayments} alert={stats.failedPayments > 0} />
          <Kpi label="Versements en échec" value={stats.failedPayouts} alert={stats.failedPayouts > 0} />
          <Kpi label="Litiges ouverts" value={stats.openDisputes} alert={stats.openDisputes > 0} />
          <Kpi label="Corrections en attente" value={stats.pendingLedgerCorrections} alert={stats.pendingLedgerCorrections > 0} />
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Démarrer</h3>
        <p className="muted">
          Utilisez le menu à gauche pour gérer les utilisateurs, les tontines, suivre les paiements, rapprocher le
          grand livre, traiter les litiges et consulter le journal des actions admin.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`kpi-card ${alert ? "alert" : ""}`}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
