import { NextResponse } from "next/server";
import type { PaymentProviderCode } from "@prisma/client";
import { processProviderWebhook } from "@/lib/payments/webhook-processor";
import { verifyGenericHmacSignature } from "@/lib/payments/verify-signature";

const PROVIDER_SLUGS: Record<string, PaymentProviderCode> = {
  "orange-money": "ORANGE_MONEY",
  "mtn-momo": "MTN_MOMO",
  "moov-money": "MOOV_MONEY",
  wave: "WAVE",
};

/**
 * Point d'entrée webhook générique pour les prestataires Mobile Money.
 *
 * ATTENTION avant mise en production réelle : le schéma de signature et le format du
 * corps de requête ci-dessous sont des PLACEHOLDERS génériques (voir
 * src/lib/payments/verify-signature.ts). Chaque prestataire a son propre schéma — à adapter
 * en suivant sa documentation officielle avant d'activer réellement cette route.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const providerCode = PROVIDER_SLUGS[provider];
  if (!providerCode) {
    return NextResponse.json({ error: "Prestataire inconnu." }, { status: 404 });
  }

  const rawBody = await request.text();
  const signatureValid = verifyGenericHmacSignature(rawBody, request.headers.get("x-signature"));

  let parsed: {
    externalEventId?: string;
    providerRef?: string;
    status?: "SUCCESS" | "FAILED" | "REFUNDED";
    failureReason?: string;
  };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!parsed.externalEventId || !parsed.providerRef || !parsed.status) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  const result = await processProviderWebhook({
    providerCode,
    externalEventId: parsed.externalEventId,
    providerRef: parsed.providerRef,
    outcome: parsed.status,
    failureReason: parsed.failureReason,
    rawPayload: parsed,
    signatureValid,
  });

  if (!result.ok && result.reason === "invalid_signature") {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  // On répond 200 même si le paiement correspondant n'a pas été trouvé ou était déjà
  // finalisé : c'est un évènement normal du point de vue transport (double livraison,
  // webhook tardif...), pas une erreur du prestataire. Le détail est dans AuditLog /
  // PaymentWebhookEvent.processingError pour investigation.
  return NextResponse.json({ received: true });
}
