// Interface d'abstraction fournisseur (cf. TRD : changer d'agrégateur Mobile Money sans toucher au métier).
export interface InitiatePaymentInput {
  paymentId: string;
  amount: bigint;
  operator: string | null;
  momoNumber: string | null;
  direction: "in" | "out";
}

export interface InitiatePaymentResult {
  providerRef: string;
}

export interface PaymentProvider {
  name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
}

export type WebhookCallback = (event: {
  provider: string;
  eventId: string;
  providerRef: string;
  status: "succeeded" | "failed";
  payload: Record<string, unknown>;
}) => Promise<void>;
