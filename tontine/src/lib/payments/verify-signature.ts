import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérification de signature générique (HMAC-SHA256 sur le corps brut de la requête), à
 * adapter au schéma réel de chaque prestataire lors de l'activation :
 * - Chaque prestataire Mobile Money a son propre schéma de signature (en-tête, algorithme,
 *   éventuellement un secret par marchand plutôt qu'un secret global). Consultez la
 *   documentation officielle du prestataire avant mise en production.
 * - En l'absence de PAYMENT_WEBHOOK_SIGNING_SECRET, toute signature est considérée invalide
 *   par défaut (fail-safe) : aucun webhook non signé n'est jamais traité comme authentique.
 */
export function verifyGenericHmacSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SIGNING_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
