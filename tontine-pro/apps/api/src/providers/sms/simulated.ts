// Simulateur d'envoi SMS/WhatsApp pour le développement : log serveur au lieu d'un vrai envoi payant.
export async function sendSms(phone: string, message: string) {
  // eslint-disable-next-line no-console
  console.log(`[sms:simulé] -> ${phone} : ${message}`);
}
