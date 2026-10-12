import fs from 'node:fs';
import path from 'node:path';

// Stockage JSON simple (un fichier par commerce). Remplaçable par une vraie base plus tard.
export class Store {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.cache = new Map();
  }

  file(tenantId) {
    return path.join(this.dir, `${tenantId}.json`);
  }

  load(tenantId) {
    if (!this.cache.has(tenantId)) {
      let data = { chats: {}, seen: [] };
      try {
        data = JSON.parse(fs.readFileSync(this.file(tenantId), 'utf8'));
      } catch {}
      this.cache.set(tenantId, data);
    }
    return this.cache.get(tenantId);
  }

  save(tenantId) {
    fs.writeFileSync(this.file(tenantId), JSON.stringify(this.load(tenantId)));
  }

  async getChat(tenantId, phone) {
    const d = this.load(tenantId);
    return (d.chats[phone] ||= { history: [], handedOff: false });
  }

  async saveChat(tenantId) {
    this.save(tenantId);
  }

  async isDuplicate(tenantId, msgId) {
    const d = this.load(tenantId);
    if (d.seen.includes(msgId)) return true;
    d.seen.push(msgId);
    if (d.seen.length > 500) d.seen.shift();
    return false;
  }

  async logOrder(tenantId, order) {
    fs.appendFileSync(path.join(this.dir, `${tenantId}.orders.jsonl`), JSON.stringify({ at: new Date().toISOString(), ...order }) + '\n');
  }
}
