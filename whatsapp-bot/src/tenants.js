import fs from 'node:fs';
import path from 'node:path';

const REQUIRED = ['id', 'phone_number_id', 'name', 'hours', 'prices'];

export function validateTenant(t, file = '') {
  const missing = REQUIRED.filter((k) => t[k] === undefined || t[k] === '');
  if (missing.length) throw new Error(`Fiche ${file || t.id}: champs manquants: ${missing.join(', ')}`);
  if (!Array.isArray(t.prices) || t.prices.some((p) => !p.item || typeof p.price !== 'number')) {
    throw new Error(`Fiche ${t.id}: "prices" doit être une liste de { item, price }`);
  }
  return t;
}

export function loadTenants(dir) {
  const byPhone = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const t = validateTenant(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), f);
    byPhone.set(String(t.phone_number_id), t);
  }
  return byPhone;
}
