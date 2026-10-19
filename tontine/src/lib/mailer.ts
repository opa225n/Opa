import "server-only";

/**
 * Envoi d'emails transactionnels — même principe que src/lib/payments/service.ts pour
 * Mobile Money : si aucun fournisseur n'est configuré (clé API absente), on bascule en mode
 * démonstration et on NE TENTE AUCUN envoi réel ; l'appelant reçoit alors `sent: false` et doit
 * afficher l'information nécessaire directement dans l'interface (ex: le lien de
 * réinitialisation) pour rester utilisable sans compte externe.
 *
 * Pour activer un envoi réel (ex: Bird — déjà connecté à ce projet côté MCP, ou Resend) :
 * 1. Renseigner RESEND_API_KEY (ou l'équivalent du fournisseur choisi) dans l'environnement.
 * 2. Vérifier le domaine d'envoi (ex: tontine-ci.com) auprès du fournisseur.
 * 3. Implémenter l'appel réel ci-dessous, en remplaçant le bloc "TODO".
 */

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail(
  _params: SendPasswordResetEmailParams
): Promise<{ sent: boolean }> {
  if (!isMailerConfigured()) {
    return { sent: false };
  }

  // TODO intégration réelle (Resend, Bird, ...) : envoyer un email à params.to contenant
  // params.resetUrl. Voir les commentaires de ce fichier.
  throw new Error(
    "RESEND_API_KEY est présente, mais l'appel d'envoi réel n'est pas encore implémenté " +
      "dans ce projet. Voir les commentaires de src/lib/mailer.ts."
  );
}
