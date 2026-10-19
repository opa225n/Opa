import type { MobileMoneyAdapter, InitiatePaymentParams, InitiatePaymentResult } from "../types";
import { ProviderNotConfiguredError } from "../types";

/**
 * Wave (Côte d'Ivoire) — intégration non activée.
 *
 * Pour activer réellement cette intégration :
 * 1. Créer un compte marchand sur le portail Wave for Business et obtenir une clé API.
 * 2. Renseigner WAVE_API_KEY dans .env.
 * 3. Implémenter ci-dessous l'appel réel à l'API Checkout de Wave, en suivant la
 *    documentation officielle du prestataire.
 * 4. Implémenter le point d'entrée webhook correspondant dans
 *    src/app/api/webhooks/mobile-money/wave/route.ts et vérifier sa signature
 *    (Wave signe ses webhooks ; valider l'en-tête de signature avant tout traitement).
 */
export const waveAdapter: MobileMoneyAdapter = {
  code: "WAVE",
  label: "Wave",

  isConfigured() {
    return Boolean(process.env.WAVE_API_KEY);
  },

  async initiatePayment(_params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    if (!process.env.WAVE_API_KEY) {
      throw new ProviderNotConfiguredError("WAVE", ["WAVE_API_KEY"]);
    }
    // TODO intégration réelle : appel à l'API Checkout Wave.
    throw new Error(
      "La clé API Wave est présente, mais l'appel API réel n'est pas encore implémenté " +
        "dans ce projet. Voir les commentaires de ce fichier."
    );
  },
};
