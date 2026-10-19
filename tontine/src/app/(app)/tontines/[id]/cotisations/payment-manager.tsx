"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  recordPaymentAction,
  confirmPaymentAction,
  rejectPaymentAction,
} from "@/app/actions/tontines";
import {
  initiateMobileMoneyPaymentAction,
  simulateMobileMoneyCallbackAction,
} from "@/app/actions/mobile-money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
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
  notes: string | null;
}

const MOBILE_MONEY_PROVIDERS = [
  { code: "ORANGE_MONEY", label: "Orange Money" },
  { code: "MTN_MOMO", label: "MTN Mobile Money" },
  { code: "MOOV_MONEY", label: "Moov Money" },
  { code: "WAVE", label: "Wave" },
];

function isDemoPayment(p: PaymentRow) {
  return p.method === "MOBILE_MONEY" && (p.notes?.includes("[DÉMO]") ?? false);
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
  const [showMobileMoneyForm, setShowMobileMoneyForm] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(remainingXof, 0)));
  const [method, setMethod] = useState("CASH");
  const [ref, setRef] = useState("");
  const [mmAmount, setMmAmount] = useState(String(Math.max(remainingXof, 0)));
  const [mmProvider, setMmProvider] = useState("ORANGE_MONEY");
  const [error, setError] = useState<string | null>(null);
  const [mmError, setMmError] = useState<string | null>(null);
  const [mmInfo, setMmInfo] = useState<string | null>(null);
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

  async function handleInitiateMobileMoney() {
    setLoading(true);
    setMmError(null);
    setMmInfo(null);
    try {
      const result = await initiateMobileMoneyPaymentAction({
        contributionId,
        providerCode: mmProvider,
        amountXof: Number(mmAmount),
      });
      if (!result.ok) {
        setMmError(result.error);
        return;
      }
      setMmInfo(
        result.data.isDemo
          ? `[DÉMO] Paiement initié (réf. ${result.data.providerRef}). Aucun transfert réel. Utilisez les boutons de simulation ci-dessous pour poursuivre.`
          : `Paiement initié auprès du prestataire (réf. ${result.data.providerRef}). En attente de confirmation.`
      );
      setShowMobileMoneyForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate(paymentId: string, outcome: "SUCCESS" | "FAILED") {
    setLoading(true);
    try {
      const result = await simulateMobileMoneyCallbackAction(paymentId, outcome);
      if (!result.ok) {
        setMmError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {payments.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-medium">{formatXof(p.amountXof)}</span>{" "}
              <span className="text-stone-500">
                · {PAYMENT_METHOD_LABELS[p.method]} ·{" "}
                {p.isManualEntry ? "saisie manuelle" : "confirmation prestataire"}
              </span>
              {p.transactionRef && <span className="text-stone-400"> · réf. {p.transactionRef}</span>}
              {isDemoPayment(p) && (
                <Badge variant="warning" className="ml-2">
                  DÉMO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  p.status === "CONFIRMED" ? "default" : p.status === "REJECTED" ? "destructive" : "warning"
                }
              >
                {PAYMENT_STATUS_LABELS[p.status]}
              </Badge>
              {canManage && p.status !== "CONFIRMED" && p.status !== "REJECTED" && !isDemoPayment(p) && (
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
          {isDemoPayment(p) && p.status === "DECLARED" && (canSelfDeclare || canManage) && (
            <div className="flex items-center gap-2 border-t border-dashed border-amber-300 pt-2">
              <span className="text-xs text-amber-700">
                Mode démonstration — simulez la réponse du prestataire :
              </span>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => handleSimulate(p.id, "SUCCESS")}>
                [DÉMO] Simuler succès
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                disabled={loading}
                onClick={() => handleSimulate(p.id, "FAILED")}
              >
                [DÉMO] Simuler échec
              </Button>
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {mmError && <p className="text-sm text-red-600">{mmError}</p>}
      {mmInfo && <Alert variant="warning">{mmInfo}</Alert>}

      {(canSelfDeclare || canManage) && remainingXof > 0 && (
        <div className="flex flex-wrap gap-2">
          {!showForm ? (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-fit">
              Ajouter un paiement (manuel)
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
                <option value="MOBILE_MONEY">Mobile Money (déclaration manuelle)</option>
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

          {!showMobileMoneyForm ? (
            <Button size="sm" variant="secondary" onClick={() => setShowMobileMoneyForm(true)} className="w-fit">
              Payer via Mobile Money
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-orange-200 bg-orange-50 p-3">
              <select
                value={mmProvider}
                onChange={(e) => setMmProvider(e.target.value)}
                className="h-11 rounded-lg border border-stone-300 px-2 text-sm"
              >
                {MOBILE_MONEY_PROVIDERS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                value={mmAmount}
                onChange={(e) => setMmAmount(e.target.value)}
                className="w-32"
                aria-label="Montant Mobile Money"
              />
              <Button size="sm" disabled={loading} onClick={handleInitiateMobileMoney}>
                Initier le paiement
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowMobileMoneyForm(false)}>
                Annuler
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
