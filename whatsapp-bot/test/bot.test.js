import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSystemPrompt, HANDOFF_MESSAGE, ORDER_MARKER } from '../src/prompt.js';
import { loadTenants, validateTenant } from '../src/tenants.js';
import { handleWebhook } from '../src/handler.js';
import { Store } from '../src/store.js';
import { verifySignature } from '../src/whatsapp.js';

const tenant = [...loadTenants(path.resolve('tenants')).values()][0];

function payload(text, id = 'm1', from = '2250700000000') {
  return {
    entry: [{ changes: [{ value: {
      metadata: { phone_number_id: tenant.phone_number_id },
      contacts: [{ wa_id: from, profile: { name: 'Awa' } }],
      messages: [{ from, id, type: 'text', text: { body: text } }],
    } }] }],
  };
}

function setup(replies) {
  const sent = [];
  const asked = [];
  const deps = {
    tenants: loadTenants(path.resolve('tenants')),
    store: new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'bot-'))),
    config: { historyLimit: 20 },
    ask: async (o) => { asked.push({ ...o, messages: [...o.messages] }); return replies.shift(); },
    send: async (m) => { sent.push(m); },
  };
  return { deps, sent, asked };
}

test('le prompt contient les infos de la fiche et les règles', () => {
  const p = buildSystemPrompt(tenant);
  assert.match(p, /Pressing Éclat/);
  assert.match(p, /costume 2 500 FCFA/);
  assert.match(p, new RegExp(HANDOFF_MESSAGE));
  assert.match(p, /vouvoiement/);
});

test('fiche invalide refusée', () => {
  assert.throws(() => validateTenant({ id: 'x' }), /champs manquants/);
  assert.throws(() => validateTenant({ id: 'x', phone_number_id: '1', name: 'n', hours: 'h', prices: [{ item: 'a' }] }), /prices/);
});

test('répond au client et garde l\'historique', async () => {
  const { deps, sent, asked } = setup(['Bonjour !', 'Un costume coûte 2 500 FCFA.']);
  await handleWebhook(payload('Bonjour'), deps);
  await handleWebhook(payload('Prix costume ?', 'm2'), deps);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, '2250700000000');
  assert.equal(asked[1].messages.length, 3);
});

test('ignore les doublons de webhook', async () => {
  const { deps, sent } = setup(['Bonjour !', 'Bonjour !']);
  await handleWebhook(payload('Bonjour', 'same'), deps);
  await handleWebhook(payload('Bonjour', 'same'), deps);
  assert.equal(sent.length, 1);
});

test('réclamation : transfert au responsable puis silence', async () => {
  const { deps, sent } = setup([HANDOFF_MESSAGE]);
  await handleWebhook(payload('Ma chemise est déchirée'), deps);
  await handleWebhook(payload('Alors ?', 'm2'), deps);
  assert.equal(sent.length, 1);
});

test('commande confirmée : marqueur retiré et commande enregistrée', async () => {
  const { deps, sent } = setup([`Merci, commande confirmée !\n${ORDER_MARKER}`]);
  await handleWebhook(payload('Oui je confirme'), deps);
  assert.ok(!sent[0].body.includes(ORDER_MARKER));
  const log = path.join(deps.store.dir, `${tenant.id}.orders.jsonl`);
  assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1);
});

test('numéro inconnu ignoré', async () => {
  const { deps, sent } = setup(['x']);
  const p = payload('Bonjour');
  p.entry[0].changes[0].value.metadata.phone_number_id = 'inconnu';
  await handleWebhook(p, deps);
  assert.equal(sent.length, 0);
});

test('signature webhook', () => {
  const body = Buffer.from('{"a":1}');
  const sig = 'sha256=' + crypto.createHmac('sha256', 's3cret').update(body).digest('hex');
  assert.ok(verifySignature(body, sig, 's3cret'));
  assert.ok(!verifySignature(body, 'sha256=00', 's3cret'));
  assert.ok(!verifySignature(body, undefined, 's3cret'));
});

import { cleanParam } from '../src/whatsapp.js';

test('paramètres de modèle nettoyés pour Meta', () => {
  assert.equal(cleanParam('a\n\nb\tc    d'), 'a | b | c d');
  assert.equal(cleanParam(''), '-');
  assert.equal(cleanParam('x'.repeat(500)).length, 400);
});

test('alerte responsable via alertOwner (réclamation)', async () => {
  const { deps, sent } = setup([HANDOFF_MESSAGE]);
  const t = deps.tenants.values().next().value;
  t.owner_phone = '2250500000000';
  const alerts = [];
  deps.alertOwner = async (tn, a) => alerts.push(a);
  await handleWebhook(payload('Ma chemise est déchirée'), deps);
  assert.equal(sent.length, 1); // seule la réponse au client passe par send
  assert.equal(alerts[0].kind, 'Réclamation client');
  assert.match(alerts[0].detail, /déchirée/);
  t.owner_phone = 'X'; // ne pas polluer les autres tests (Map rechargée à chaque setup)
});

test('échec de l\'alerte responsable sans casser la réponse au client', async () => {
  const { deps, sent } = setup([HANDOFF_MESSAGE]);
  const t = deps.tenants.values().next().value;
  t.owner_phone = '2250500000000';
  deps.alertOwner = async () => { throw new Error('boom'); };
  await handleWebhook(payload('Remise ?'), deps);
  assert.equal(sent.length, 1);
});
