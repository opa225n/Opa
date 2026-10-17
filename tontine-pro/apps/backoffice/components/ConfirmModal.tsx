"use client";
import { useState } from "react";

export function ConfirmModal({
  title,
  body,
  confirmLabel = "Confirmer",
  danger = false,
  requireReason = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (requireReason && reason.trim().length < 3) {
      setError("Un motif est requis (au moins 3 caractères).");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 8 }}>{title}</h3>
        <p className="muted" style={{ marginBottom: 16, fontSize: 14 }}>
          {body}
        </p>
        {requireReason && (
          <div className="field">
            <label>Motif (obligatoire)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez la raison de cette action…" />
          </div>
        )}
        {error && <div className="error-text">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={confirm}>
            {confirmLabel}
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
