// Simule une conversation WhatsApp dans le terminal : npm run chat -- pressing-eclat
import readline from 'node:readline/promises';
import { loadConfig } from '../src/config.js';
import { loadTenants } from '../src/tenants.js';
import { askClaude } from '../src/claude.js';
import { buildSystemPrompt, ORDER_MARKER } from '../src/prompt.js';

const config = loadConfig();
const id = process.argv[2] || 'pressing-eclat';
const tenant = [...loadTenants(config.tenantsDir).values()].find((t) => t.id === id);
if (!tenant) throw new Error(`Commerce inconnu : ${id}`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages = [];
console.log(`Test de l'assistant de ${tenant.name} (Ctrl+C pour quitter)\n`);
for (;;) {
  const q = await rl.question('Client > ');
  messages.push({ role: 'user', content: q });
  const r = await askClaude({ apiKey: config.anthropicKey, model: config.model, system: buildSystemPrompt(tenant), messages });
  messages.push({ role: 'assistant', content: r });
  console.log(`\nBot    > ${r.replace(ORDER_MARKER, '').trim()}\n`);
}
