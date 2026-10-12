import { buildSystemPrompt, HANDOFF_MESSAGE, ORDER_MARKER } from './prompt.js';
import { extractMessages } from './whatsapp.js';

const NON_TEXT_REPLY =
  "Merci pour votre message. Je ne peux lire que les messages écrits ; pourriez-vous m'écrire votre demande en texte ?";

// deps: { tenants: Map, store, ask(opts)->string, send({phoneNumberId,to,body}), config, log }
export async function handleWebhook(payload, deps) {
  for (const msg of extractMessages(payload)) {
    try {
      await handleMessage(msg, deps);
    } catch (err) {
      deps.log?.(`Erreur message ${msg.id}: ${err.message}`);
    }
  }
}

export async function handleMessage(msg, deps) {
  const { tenants, store, ask, send, config } = deps;
  const tenant = tenants.get(String(msg.phoneNumberId));
  if (!tenant) return; // numéro inconnu : on ignore
  if (await store.isDuplicate(tenant.id, msg.id)) return;

  const chat = await store.getChat(tenant.id, msg.from);
  if (chat.handedOff) return; // le responsable a repris la conversation

  if (!msg.text) {
    await send({ phoneNumberId: msg.phoneNumberId, to: msg.from, body: NON_TEXT_REPLY });
    return;
  }

  chat.history.push({ role: 'user', content: msg.text });
  chat.history = chat.history.slice(-config.historyLimit);
  while (chat.history[0]?.role !== 'user') chat.history.shift();

  let reply = await ask({ system: buildSystemPrompt(tenant), messages: chat.history });
  const ordered = reply.includes(ORDER_MARKER);
  reply = reply.replace(ORDER_MARKER, '').trim();

  chat.history.push({ role: 'assistant', content: reply });
  await send({ phoneNumberId: msg.phoneNumberId, to: msg.from, body: reply });

  if (reply.includes(HANDOFF_MESSAGE)) {
    chat.handedOff = true;
    await notifyOwner(deps, tenant, { kind: 'Réclamation client', who: `${msg.name || ''} ${msg.from}`.trim(), detail: msg.text });
  }
  if (ordered) {
    await store.logOrder(tenant.id, { customer: msg.from, name: msg.name, summary: reply, history: chat.history });
    await notifyOwner(deps, tenant, { kind: 'Nouvelle commande', who: `${msg.name || ''} ${msg.from}`.trim(), detail: reply });
  }
  await store.saveChat(tenant.id, msg.from, chat);
}

// Alerte au responsable. `deps.alertOwner` (modèle approuvé, voir server.js) sinon texte libre.
async function notifyOwner(deps, tenant, alert) {
  if (!tenant.owner_phone || /X/.test(tenant.owner_phone)) return;
  try {
    if (deps.alertOwner) return await deps.alertOwner(tenant, alert);
    await deps.send({ phoneNumberId: tenant.phone_number_id, to: tenant.owner_phone, body: `${alert.kind} — ${alert.who} : ${alert.detail}` });
  } catch (err) {
    deps.log?.(`Alerte responsable (${tenant.id}) échouée: ${err.message}`);
  }
}
