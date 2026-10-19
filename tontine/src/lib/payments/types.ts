import type { PaymentProviderCode } from "@prisma/client";

export class ProviderNotConfiguredError extends Error {
  constructor(code: PaymentProviderCode, missingVars: string[]) {
    super(
      `Le prestataire ${code} n'est pas configuré (variables manquantes : ${missingVars.join(", ")}). ` +
        `Voir la section "Intégrations externes" du README pour l'activer, ou utilisez le mode démonstration.`
    );
  }
}

export interface InitiatePaymentParams {
  /** Référence interne (notre côté) à transmettre au prestataire pour le rapprochement. */
  merchantReference: string;
  amountXof: number;
  payerPhone: string;
}

export interface InitiatePaymentResult {
  /** Référence attribuée par le prestataire à cette transaction. */
  providerRef: string;
}

export interface MobileMoneyAdapter {
  code: PaymentProviderCode;
  label: string;
  /** true seulement si les identifiants nécessaires sont présents dans l'environnement. */
  isConfigured(): boolean;
  /**
   * Initie un paiement chez le prestataire. Ne doit JAMAIS être appelé si isConfigured()
   * renvoie false : lève ProviderNotConfiguredError dans ce cas pour éviter toute confusion
   * avec une initiation réellement envoyée au prestataire.
   */
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
}
