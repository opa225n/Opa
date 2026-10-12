// Test d'intégration : TEST_DATABASE_URL=postgres://… npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import { PgStore } from '../src/pgstore.js';
import { loadTenants } from '../src/tenants.js';
import { handleWebhook } from '../src/handler.js';
import { createServer } from '../server.js';

const url = process.env.TEST_DATABASE_URL;
const opts = { skip: url ? false : 'TEST_DATABASE_URL non défini' };

test('Postgres : migration, doublons, historique, commandes, parcours complet', opts, async () => {
  const store = new PgStore(url);
  await store.migrate();
  await store.migrate(); // idempotent
  await store.pool.query('TRUNCATE seen_messages, chats, orders RESTART IDENTITY');

  assert.equal(await store.isDuplicate('t', 'a'), false);
  assert.equal(await store.isDuplicate('t', 'a'), true);

  const tenants = loadTenants(path.resolve('tenants'));
  const tenant = [...tenants.values()][0];
  const replies = ['Bonjour !', 'Commande confirmée ! [COMMANDE_CONFIRMEE]'];
  const sent = [];
  const deps = { tenants, store, config: { historyLimit: 20 }, ask: async () => replies.shift(), send: async (m) => sent.push(m) };
  const wh = (text, id) => ({ entry: [{ changes: [{ value: { metadata: { phone_number_id: tenant.phone_number_id }, contacts: [{ wa_id: '2250700000001', profile: { name: 'Awa' } }], messages: [{ from: '2250700000001', id, type: 'text', text: { body: text } }] } }] }] });
  await handleWebhook(wh('Bonjour', 'w1'), deps);
  await handleWebhook(wh('Oui je confirme', 'w2'), deps);
  await handleWebhook(wh('Oui je confirme', 'w2'), deps); // doublon Meta

  assert.equal(sent.length, 2);
  const chat = await store.getChat(tenant.id, '2250700000001');
  assert.equal(chat.history.length, 4);

  // API admin : liste puis « prête »
  const notified = [];
  const config = { verifyToken: 'v', appSecret: '', adminToken: 'secret' };
  const srv = createServer(config, { ...deps, notifyReady: async (t, o) => notified.push(o.customer) }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  const base = `http://localhost:${srv.address().port}`;
  const auth = { authorization: 'Bearer secret' };
  assert.equal((await fetch(`${base}/admin/orders?tenant=${tenant.id}`)).status, 401);
  const orders = await (await fetch(`${base}/admin/orders?tenant=${tenant.id}&status=new`, { headers: auth })).json();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].name, 'Awa');
  const r1 = await fetch(`${base}/admin/orders/${orders[0].id}/ready?tenant=${tenant.id}`, { method: 'POST', headers: auth });
  assert.equal((await r1.json()).notified, true);
  const r2 = await fetch(`${base}/admin/orders/${orders[0].id}/ready?tenant=${tenant.id}`, { method: 'POST', headers: auth });
  assert.equal(r2.status, 409); // pas de double notification
  assert.deepEqual(notified, ['2250700000001']);
  srv.close();
  await store.close();
});
