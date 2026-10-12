import fs from 'node:fs';
import crypto from 'node:crypto';

const PAGE = fs.readFileSync(new URL('./admin.html', import.meta.url), 'utf8');

function authorized(req, token) {
  if (!token) return false; // admin désactivé tant que ADMIN_TOKEN n'est pas défini
  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  const a = Buffer.from(given), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const json = (res, code, data) => res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(data));

// Renvoie true si la requête a été traitée.
export async function handleAdmin(req, res, url, { config, tenants, store, notifyReady }) {
  if (!url.pathname.startsWith('/admin')) return false;
  if (url.pathname === '/admin') return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE), true;
  if (!authorized(req, config.adminToken)) return json(res, 401, { error: 'non autorisé' }), true;
  if (!store.listOrders) return json(res, 501, { error: 'Postgres requis (DATABASE_URL)' }), true;

  if (url.pathname === '/admin/tenants' && req.method === 'GET') {
    return json(res, 200, [...tenants.values()].map((t) => ({ id: t.id, name: t.name }))), true;
  }
  if (url.pathname === '/admin/orders' && req.method === 'GET') {
    const tenant = url.searchParams.get('tenant');
    if (![...tenants.values()].some((t) => t.id === tenant)) return json(res, 404, { error: 'commerce inconnu' }), true;
    return json(res, 200, await store.listOrders(tenant, url.searchParams.get('status'))), true;
  }
  const m = url.pathname.match(/^\/admin\/orders\/(\d+)\/ready$/);
  if (m && req.method === 'POST') {
    const tenant = url.searchParams.get('tenant');
    const t = [...tenants.values()].find((x) => x.id === tenant);
    if (!t) return json(res, 404, { error: 'commerce inconnu' }), true;
    const order = await store.markReady(tenant, Number(m[1]));
    if (!order) return json(res, 409, { error: 'commande introuvable ou déjà prête' }), true;
    try {
      await notifyReady(t, order);
      return json(res, 200, { ok: true, notified: true }), true;
    } catch (err) {
      return json(res, 200, { ok: true, notified: false, error: err.message }), true;
    }
  }
  return json(res, 404, { error: 'introuvable' }), true;
}
