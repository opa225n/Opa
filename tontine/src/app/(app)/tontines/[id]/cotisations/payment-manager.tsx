"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  recordPaymentAction,
  confirmPaymentAction,
  rejectPaymentAction,
} from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";

export interface PaymentRow {
  id: string;
  amountXof: number;
  method: string;
  status: string;
  paidAt: string;
  transactionRef: string | null;
  isManualEntry: boolean;
}

export function PaymentManager({
  contributionId,
  payments,
  canSelfDeclare,
  canManage,
  remainingXof,
}: {
  contributionId: string;
  payments: PaymentRow[];
  canSelfDeclare: boolean;
  canManage: boolean;
  remainingXof: number;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(remainingXof, 0)));
  const [method, setMethod] = useState("CASH");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(mode: "SELF_DECLARE" | "MANUAL_RECORD") {
    setLoading(true);
    setError(null);
    try {
      const result = await recordPaymentAction(
        {
          contributionId,
          amountXof: Number(amount),
          method,
          paidAt: new Date().toISOString(),
          transactionRef: ref || undefined,
        },
        mode
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      setRef("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(paymentId: string) {
    setLoading(true);
    try {
      await confirmPaymentAction(paymentId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(paymentId: string) {
    const reason = window.prompt("Motif du rejet :");
    if (!reason) return;
    setLoading(true);
    try {
      await rejectPaymentAction(paymentId, reason);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm">
          <div>
            <span className="font-medium">{formatXof(p.amountXof)}</span>{" "}
            <span className="text-stone-500">
              · {PAYMENT_METHOD_LABELS[p.method]} ·{" "}
              {p.isManualEntry ? "saisie manuelle" : "confirmation prestataire"}
            </span>
            {p.transactionRef && <span className="text-stone-400"> · réf. {p.transactionRef}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                p.status === "CONFIRMED" ? "default" : p.status === "REJECTED" ? "destructive" : "warning"
              }
            >
              {PAYMENT_STATUS_LABELS[p.status]}
            </Badge>
            {canManage && p.status !== "CONFIRMED" && p.status !== "REJECTED" && (
              <>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => handleConfirm(p.id)}>
                  Confirmer
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" disabled={loading} onClick={() => handleReject(p.id)}>
                  Rejeter
                </Button>
              </>
            )}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(canSelfDeclare || canManage) && remainingXof > 0 && (
        <>
          {!showForm ? (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-fit">
              Ajouter un paiement
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-stone-200 p-3">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32"
                aria-label="Montant"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-11 rounded-lg border border-stone-300 px-2 text-sm"
              >
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
              <Input
                placeholder="Référence (facultatif)"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="w-40"
              />
              {canSelfDeclare && (
                <Button size="sm" disabled={loading} onClick={() => submit("SELF_DECLARE")}>
                  Déclarer mon paiement
                </Button>
              )}
              {canManage && (
                <Button size="sm" variant="secondary" disabled={loading} onClick={() => submit("MANUAL_RECORD")}>
                  Enregistrer (manuel)
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
