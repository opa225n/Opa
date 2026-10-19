import "server-only";
import { getBirdApiBase } from "@/lib/bird-client";

/**
 * Envoi d'emails transactionnels via Bird (https://bird.com) — même principe que
 * src/lib/payments/service.ts pour Mobile Money : si aucune clé API n'est configurée, on
 * bascule en mode démonstration et on NE TENTE AUCUN envoi réel ; l'appelant reçoit alors
 * `sent: false` et doit afficher l'information nécessaire directement dans l'interface (ex: le
 * lien de réinitialisation) pour rester utilisable sans compte externe.
 *
 * BIRD_API_KEY (clé workspace, scope `emails:write` uniquement) et BIRD_FROM_EMAIL doivent être
 * renseignées dans l'environnement. Le domaine d'envoi (ex: mail.tontine-ci.com) doit être
 * vérifié dans Bird (Email > Domains) avant que l'envoi réel ne fonctionne — tant qu'il ne
 * l'est pas, Bird refuse l'envoi et l'appelant doit retomber sur le mode démonstration.
 */

export function isMailerConfigured(): boolean {
  return Boolean(process.env.BIRD_API_KEY && process.env.BIRD_FROM_EMAIL);
}

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ sent: boolean }> {
  const apiKey = process.env.BIRD_API_KEY;
  const fromEmail = process.env.BIRD_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return { sent: false };
  }

  const response = await fetch(`${getBirdApiBase(apiKey)}/v1/email/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: "Tontine CI" },
      to: [to],
      subject: "Réinitialisation de votre mot de passe — Tontine CI",
      html: `<p>Vous avez demandé la réinitialisation de votre mot de passe Tontine CI.</p>
<p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a>. Ce lien expire dans 30 minutes.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
      text: `Vous avez demandé la réinitialisation de votre mot de passe Tontine CI.\n\n${resetUrl}\n\nCe lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Échec de l'envoi via Bird (${response.status}): ${body}`);
  }

  return { sent: true };
}
