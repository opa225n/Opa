import { randomUUID } from "crypto";
import type { InitiatePaymentInput, InitiatePaymentResult, PaymentProvider, WebhookCallback } from "./types";

// Simulateur d'agrégateur Mobile Money pour les environnements local/staging (cf. TRD §environnements :
// "local (Docker, simulateurs paiement/SMS)"). Pas d'appel réseau : un faux webhook signé arrive après un délai,
// pour reproduire fidèlement le flux asynchrone réel (initié -> en attente -> confirmé côté webhook).
export class SimulatedPaymentProvider implements PaymentProvider {
  name = "simulated";
  private webhookCallback: WebhookCallback | null = null;

  onWebhook(cb: WebhookCallback) {
    this.webhookCallback = cb;
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const providerRef = `SIM-${randomUUID()}`;
    const delayMs = 2000 + Math.floor(Math.random() * 2000);
    // Numéro de test réservé pour simuler un échec (utile pour tester le parcours d'erreur côté app).
    const shouldFail = input.momoNumber?.endsWith("0000") ?? false;
    setTimeout(() => {
      this.webhookCallback?.({
        provider: this.name,
        eventId: randomUUID(),
        providerRef,
        status: shouldFail ? "failed" : "succeeded",
        payload: { amount: input.amount.toString(), operator: input.operator, simulated: true },
      }).catch((err) => console.error("[simulated-provider] erreur webhook", err));
    }, delayMs);
    return { providerRef };
  }
}

export const simulatedPaymentProvider = new SimulatedPaymentProvider();
