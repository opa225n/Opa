import type { MobileMoneyAdapter, InitiatePaymentParams, InitiatePaymentResult } from "../types";
import { ProviderNotConfiguredError } from "../types";

/**
 * MTN Mobile Money (Côte d'Ivoire) — intégration non activée.
 *
 * Pour activer réellement cette intégration :
 * 1. Créer un compte sur le portail MTN MoMo Developer et souscrire au produit Collections.
 * 2. Renseigner MTN_MOMO_API_KEY et MTN_MOMO_SUBSCRIPTION_KEY dans .env.
 * 3. Implémenter ci-dessous l'appel réel à l'API MTN MoMo (Collections — RequestToPay),
 *    en suivant la documentation officielle du prestataire.
 * 4. Implémenter le point d'entrée webhook correspondant dans
 *    src/app/api/webhooks/mobile-money/mtn-momo/route.ts et vérifier sa signature.
 */
export const mtnMomoAdapter: MobileMoneyAdapter = {
  code: "MTN_MOMO",
  label: "MTN Mobile Money",

  isConfigured() {
    return Boolean(process.env.MTN_MOMO_API_KEY && process.env.MTN_MOMO_SUBSCRIPTION_KEY);
  },

  async initiatePayment(_params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const missing = [];
    if (!process.env.MTN_MOMO_API_KEY) missing.push("MTN_MOMO_API_KEY");
    if (!process.env.MTN_MOMO_SUBSCRIPTION_KEY) missing.push("MTN_MOMO_SUBSCRIPTION_KEY");
    if (missing.length > 0) {
      throw new ProviderNotConfiguredError("MTN_MOMO", missing);
    }
    // TODO intégration réelle : appel à l'API MTN MoMo Collections (RequestToPay).
    throw new Error(
      "Les identifiants MTN MoMo sont présents, mais l'appel API réel n'est pas encore " +
        "implémenté dans ce projet. Voir les commentaires de ce fichier."
    );
  },
};
