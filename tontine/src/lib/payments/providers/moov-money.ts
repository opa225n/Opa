import type { MobileMoneyAdapter, InitiatePaymentParams, InitiatePaymentResult } from "../types";
import { ProviderNotConfiguredError } from "../types";

/**
 * Moov Money (Côte d'Ivoire) — intégration non activée.
 *
 * Pour activer réellement cette intégration :
 * 1. Obtenir un compte marchand Moov Money et des identifiants API auprès de Moov Africa.
 * 2. Renseigner MOOV_MONEY_API_KEY dans .env.
 * 3. Implémenter ci-dessous l'appel réel à l'API de paiement Moov Money, en suivant la
 *    documentation officielle du prestataire.
 * 4. Implémenter le point d'entrée webhook correspondant dans
 *    src/app/api/webhooks/mobile-money/moov-money/route.ts et vérifier sa signature.
 */
export const moovMoneyAdapter: MobileMoneyAdapter = {
  code: "MOOV_MONEY",
  label: "Moov Money",

  isConfigured() {
    return Boolean(process.env.MOOV_MONEY_API_KEY);
  },

  async initiatePayment(_params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    if (!process.env.MOOV_MONEY_API_KEY) {
      throw new ProviderNotConfiguredError("MOOV_MONEY", ["MOOV_MONEY_API_KEY"]);
    }
    // TODO intégration réelle : appel à l'API de paiement Moov Money.
    throw new Error(
      "Les identifiants Moov Money sont présents, mais l'appel API réel n'est pas encore " +
        "implémenté dans ce projet. Voir les commentaires de ce fichier."
    );
  },
};
