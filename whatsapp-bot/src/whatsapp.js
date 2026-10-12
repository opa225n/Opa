import crypto from 'node:crypto';

export function verifySignature(rawBody, header, appSecret) {
  if (!appSecret) return true; // à éviter en production
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function sendText({ token, phoneNumberId, to, body, fetchImpl = fetch }) {
  const res = await fetchImpl(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
}

// Extrait les messages texte d'un payload webhook Meta.
export function extractMessages(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      const phoneNumberId = v.metadata?.phone_number_id;
      for (const m of v.messages || []) {
        out.push({
          phoneNumberId,
          from: m.from,
          id: m.id,
          type: m.type,
          text: m.type === 'text' ? m.text?.body : null,
          name: (v.contacts || []).find((c) => c.wa_id === m.from)?.profile?.name,
        });
      }
    }
  }
  return out;
}

// Meta refuse dans un paramètre de modèle : sauts de ligne, tabulations, 4 espaces d'affilée, texte vide.
export function cleanParam(text, max = 400) {
  const t = String(text ?? '').replace(/[\r\n\t]+/g, ' | ').replace(/ {2,}/g, ' ').replace(/( \| )+/g, ' | ').trim();
  return (t.length > max ? t.slice(0, max - 1) + '…' : t) || '-';
}

// Message modèle (template) : seul moyen d'écrire à un client hors de la fenêtre de 24 h.
export async function sendTemplate({ token, phoneNumberId, to, name, language = 'fr', params = [], fetchImpl = fetch }) {
  const components = params.length
    ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: cleanParam(text) })) }]
    : [];
  const res = await fetchImpl(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name, language: { code: language }, components } }),
  });
  if (!res.ok) throw new Error(`WhatsApp template ${res.status}: ${await res.text()}`);
}
