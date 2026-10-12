import fs from 'node:fs';
import pg from 'pg';

// Même interface (asynchrone) que Store, mais sur Postgres.
export class PgStore {
  constructor(databaseUrl, { pool } = {}) {
    this.pool =
      pool ||
      new pg.Pool({
        connectionString: databaseUrl,
        max: 5,
        // Neon, Supabase, Railway… exigent TLS ; désactivable pour une base locale.
        ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: false },
      });
  }

  async migrate() {
    await this.pool.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  }

  async isDuplicate(tenantId, msgId) {
    const r = await this.pool.query(
      'INSERT INTO seen_messages (tenant_id, msg_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [tenantId, msgId],
    );
    return r.rowCount === 0;
  }

  async getChat(tenantId, phone) {
    const r = await this.pool.query('SELECT history, handed_off FROM chats WHERE tenant_id=$1 AND phone=$2', [tenantId, phone]);
    return r.rows[0] ? { history: r.rows[0].history, handedOff: r.rows[0].handed_off } : { history: [], handedOff: false };
  }

  async saveChat(tenantId, phone, chat) {
    await this.pool.query(
      `INSERT INTO chats (tenant_id, phone, history, handed_off) VALUES ($1,$2,$3,$4)
       ON CONFLICT (tenant_id, phone) DO UPDATE SET history=$3, handed_off=$4, updated_at=now()`,
      [tenantId, phone, JSON.stringify(chat.history), chat.handedOff],
    );
  }

  async logOrder(tenantId, { customer, name, summary, history }) {
    const r = await this.pool.query(
      'INSERT INTO orders (tenant_id, customer, name, summary, history) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [tenantId, customer, name || null, summary || null, JSON.stringify(history || [])],
    );
    return r.rows[0].id;
  }

  async listOrders(tenantId, status) {
    const r = await this.pool.query(
      `SELECT id, customer, name, summary, status, created_at, ready_at FROM orders
       WHERE tenant_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC LIMIT 200`,
      [tenantId, status || null],
    );
    return r.rows;
  }

  // Passe une commande à « prête ». Renvoie la commande (pour prévenir le client) ou null.
  async markReady(tenantId, orderId) {
    const r = await this.pool.query(
      `UPDATE orders SET status='ready', ready_at=now() WHERE tenant_id=$1 AND id=$2 AND status='new'
       RETURNING id, customer, name`,
      [tenantId, orderId],
    );
    return r.rows[0] || null;
  }

  async close() {
    await this.pool.end();
  }
}
