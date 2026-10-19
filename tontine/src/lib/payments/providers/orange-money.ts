import type { MobileMoneyAdapter, InitiatePaymentParams, InitiatePaymentResult } from "../types";
import { ProviderNotConfiguredError } from "../types";

/**
 * Orange Money (Côte d'Ivoire) — intégration non activée.
 *
 * Pour activer réellement cette intégration :
 * 1. Obtenir un compte marchand Orange Money CI et des identifiants API auprès d'Orange.
 * 2. Renseigner ORANGE_MONEY_API_KEY et ORANGE_MONEY_MERCHANT_ID dans .env.
 * 3. Implémenter ci-dessous l'appel réel à l'API Orange Money Web Payment (OAuth2 +
 *    endpoint de paiement), en suivant la documentation officielle du prestataire —
 *    jamais reproduite ici car elle n'a pas été consultée pour ce projet.
 * 4. Implémenter le point d'entrée webhook correspondant dans
 *    src/app/api/webhooks/mobile-money/orange-money/route.ts et vérifier sa signature.
 */
export const orangeMoneyAdapter: MobileMoneyAdapter = {
  code: "ORANGE_MONEY",
  label: "Orange Money",

  isConfigured() {
    return Boolean(process.env.ORANGE_MONEY_API_KEY && process.env.ORANGE_MONEY_MERCHANT_ID);
  },

  async initiatePayment(_params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const missing = [];
    if (!process.env.ORANGE_MONEY_API_KEY) missing.push("ORANGE_MONEY_API_KEY");
    if (!process.env.ORANGE_MONEY_MERCHANT_ID) missing.push("ORANGE_MONEY_MERCHANT_ID");
    if (missing.length > 0) {
      throw new ProviderNotConfiguredError("ORANGE_MONEY", missing);
    }
    // TODO intégration réelle : appel à l'API Orange Money Web Payment.
    throw new Error(
      "Les identifiants Orange Money sont présents, mais l'appel API réel n'est pas encore " +
        "implémenté dans ce projet. Voir les commentaires de ce fichier."
    );
  },
};
