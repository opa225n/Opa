import http from 'node:http';
import { loadConfig } from './src/config.js';
import { loadTenants } from './src/tenants.js';
import { Store } from './src/store.js';
import { askClaude } from './src/claude.js';
import { sendText, verifySignature } from './src/whatsapp.js';
import { handleWebhook } from './src/handler.js';

export function createServer(config, deps) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') return res.end('ok');
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
  const config = loadConfig();
  if (!config.anthropicKey || !config.waToken) console.warn('ANTHROPIC_API_KEY et WHATSAPP_TOKEN sont requis.');
  const tenants = loadTenants(config.tenantsDir);
  const deps = {
    tenants,
    config,
    store: new Store(config.dataDir),
    ask: ({ system, messages }) => askClaude({ apiKey: config.anthropicKey, model: config.model, system, messages }),
    send: ({ phoneNumberId, to, body }) => sendText({ token: config.waToken, phoneNumberId, to, body }),
    log: (m) => console.error(m),
  };
  createServer(config, deps).listen(config.port, () => console.log(`Bot en écoute sur :${config.port} (${tenants.size} commerce(s))`));
}
