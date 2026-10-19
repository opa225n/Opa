import "server-only";
import { getBirdApiBase } from "@/lib/bird-client";

/**
 * Envoi de SMS (code de vérification) via Bird (https://bird.com) — même principe que
 * src/lib/mailer.ts : sans clé configurée, on bascule en mode démonstration (le code est affiché
 * directement dans l'interface) sans tenter d'envoi réel.
 *
 * BIRD_API_KEY doit porter le scope `sms:write` (en plus de `emails:write` si les deux sont
 * utilisés). Le gabarit intégré "bird_otp_verification" est utilisé : il ne nécessite ni
 * expéditeur dédié ni enregistrement préalable, mais le pays de destination doit être activé
 * dans Bird (SMS > Destinations) et le portefeuille du workspace doit être approvisionné.
 */

export function isSmsConfigured(): boolean {
  return Boolean(process.env.BIRD_API_KEY);
}

interface SendVerificationSmsParams {
  to: string;
  code: string;
}

export async function sendVerificationSms({
  to,
  code,
}: SendVerificationSmsParams): Promise<{ sent: boolean }> {
  const apiKey = process.env.BIRD_API_KEY;
  if (!apiKey) {
    return { sent: false };
  }

  const response = await fetch(`${getBirdApiBase(apiKey)}/v1/sms/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      template: { slug: "bird_otp_verification", parameters: { code } },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Échec de l'envoi SMS via Bird (${response.status}): ${body}`);
  }

  return { sent: true };
}
