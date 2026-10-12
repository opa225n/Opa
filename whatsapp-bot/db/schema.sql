-- Schéma idempotent : exécuté au démarrage.
CREATE TABLE IF NOT EXISTS seen_messages (
  tenant_id  text NOT NULL,
  msg_id     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, msg_id)
);

CREATE TABLE IF NOT EXISTS chats (
  tenant_id  text NOT NULL,
  phone      text NOT NULL,
  history    jsonb NOT NULL DEFAULT '[]',
  handed_off boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, phone)
);

CREATE TABLE IF NOT EXISTS orders (
  id         bigserial PRIMARY KEY,
  tenant_id  text NOT NULL,
  customer   text NOT NULL,
  name       text,
  summary    text,
  history    jsonb NOT NULL DEFAULT '[]',
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new','ready','done','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ready_at   timestamptz
);
CREATE INDEX IF NOT EXISTS orders_tenant_status ON orders (tenant_id, status, created_at DESC);
