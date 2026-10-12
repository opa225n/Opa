import path from 'node:path';

export function loadConfig(env = process.env) {
  return {
    databaseUrl: env.DATABASE_URL || '',
    adminToken: env.ADMIN_TOKEN || '',
    port: Number(env.PORT || 3000),
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    model: env.CLAUDE_MODEL || 'claude-sonnet-5-5',
    waToken: env.WHATSAPP_TOKEN || '',
    verifyToken: env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: env.WHATSAPP_APP_SECRET || '',
    dataDir: path.resolve(env.DATA_DIR || './data'),
    tenantsDir: path.resolve(env.TENANTS_DIR || './tenants'),
    historyLimit: 20,
  };
}
