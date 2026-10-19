import "server-only";
import { randomUUID } from "node:crypto";
import type { PaymentProviderCode } from "@prisma/client";
import { getAdapter, isProviderConfigured } from "./registry";
import type { InitiatePaymentParams } from "./types";

export interface InitiateResult {
  providerRef: string;
  /** true si aucun prestataire réel n'est configuré : aucun transfert d'argent n'a eu lieu. */
  isDemo: boolean;
}

/**
 * Point d'entrée unique pour initier un paiement Mobile Money, quel que soit le prestataire.
 * Si le prestataire choisi n'est pas configuré (aucune clé API dans l'environnement), bascule
 * automatiquement en mode démonstration : une référence locale est générée, mais AUCUN appel
 * externe n'est effectué et AUCUN argent ne change de main. Le paiement reste au statut
 * DECLARED jusqu'à sa confirmation (réelle via webhook, ou simulée via le bouton de
 * démonstration), exactement comme pour un paiement manuel.
 */
export async function initiateMobileMoneyPayment(
  code: PaymentProviderCode,
  params: InitiatePaymentParams
): Promise<InitiateResult> {
  if (isProviderConfigured(code)) {
    const adapter = getAdapter(code);
    const result = await adapter.initiatePayment(params);
    return { providerRef: result.providerRef, isDemo: false };
  }

  return { providerRef: `DEMO-${code}-${randomUUID()}`, isDemo: true };
}
