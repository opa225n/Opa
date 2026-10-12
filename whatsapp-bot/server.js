import http from 'node:http';
import { loadConfig } from './src/config.js';
import { loadTenants } from './src/tenants.js';
import { Store } from './src/store.js';
import { askClaude } from './src/claude.js';
import { sendText, sendTemplate, verifySignature } from './src/whatsapp.js';
import { PgStore } from './src/pgstore.js';
import { handleAdmin } from './src/admin.js';
import { handleWebhook } from './src/handler.js';

export function createServer(config, deps) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') return res.end('ok');
    if (await handleAdmin(req, res, url, { ...deps, config })) return;
    if (url.pathname !== '/webhook') return res.writeHead(404).end();

    if (req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === config.verifyToken;
      return ok ? res.end(url.searchParams.get('hub.challenge')) : res.writeHead(403).end();
    }
    if (req.method !== 'POST') return res.writeHead(405).end();

    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    if (!verifySignature(raw, req.headers['x-hub-signature-256'], config.appSecret)) return res.writeHead(401).end();

    res.writeHead(200).end(); // Meta exige une réponse rapide
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return;
    }
    handleWebhook(payload, deps);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

async function main() {
  const config = loadConfig();
  if (!config.anthropicKey || !config.waToken) console.warn('ANTHROPIC_API_KEY et WHATSAPP_TOKEN sont requis.');
  const tenants = loadTenants(config.tenantsDir);
  let store;
  if (config.databaseUrl) {
    store = new PgStore(config.databaseUrl);
    await store.migrate();
  } else {
    console.warn('DATABASE_URL absent : stockage fichier (développement uniquement).');
    store = new Store(config.dataDir);
  }
  const send = ({ phoneNumberId, to, body }) => sendText({ token: config.waToken, phoneNumberId, to, body });
  const deps = {
    tenants,
    config,
    store,
    // Prévient le client que sa commande est prête (modèle approuvé si la fiche en définit un).
    notifyReady: async (tenant, order) => {
      const tpl = tenant.ready_template;
      if (tpl) {
        return sendTemplate({ token: config.waToken, phoneNumberId: tenant.phone_number_id, to: order.customer, name: tpl.name, language: tpl.language, params: [order.name || 'cher client', tenant.name] });
      }
      return send({ phoneNumberId: tenant.phone_number_id, to: order.customer, body: `Bonjour ${order.name || ''}, votre commande chez ${tenant.name} est prête ! Nous vous attendons ou nous vous la livrons selon ce qui a été convenu.`.replace('  ', ' ') });
    },
    // Alerte au responsable : modèle approuvé (marche hors fenêtre de 24 h), sinon texte libre.
    alertOwner: async (tenant, { kind, who, detail }) => {
      const tpl = tenant.owner_template;
      if (tpl) {
        try {
          return await sendTemplate({ token: config.waToken, phoneNumberId: tenant.phone_number_id, to: tenant.owner_phone, name: tpl.name, language: tpl.language, params: [kind, who, detail] });
        } catch (err) {
          console.error(`Modèle responsable refusé (${tenant.id}): ${err.message} — repli texte`);
        }
      }
      return send({ phoneNumberId: tenant.phone_number_id, to: tenant.owner_phone, body: `${kind} — ${who} : ${detail}` });
    },
    ask: ({ system, messages }) => askClaude({ apiKey: config.anthropicKey, model: config.model, system, messages }),
    send,
    log: (m) => console.error(m),
  };
  createServer(config, deps).listen(config.port, () => console.log(`Bot en écoute sur :${config.port} (${tenants.size} commerce(s))`));
}
