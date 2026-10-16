-- Migration 002 : conversations, messages, commandes, événements, modèles de messages
-- Source : Schéma backend – Agence d'automatisation WhatsApp/IA, section 3.

create table conversations (
  id                        uuid primary key default gen_random_uuid(),
  commerce_id               uuid not null references commerces(id) on delete cascade,
  contact_id                uuid not null unique references contacts(id) on delete cascade,
  etat                      etat_conversation not null default 'nouveau',
  contexte                  jsonb not null default '{}',  -- champs de commande en cours
  dernier_message_client_le timestamptz,                  -- fenetre de 24 h
  dernier_message_le        timestamptz not null default now(),
  humain_depuis             timestamptz
);

create table messages (
  id                  uuid primary key default gen_random_uuid(),
  commerce_id         uuid not null references commerces(id) on delete cascade,
  conversation_id     uuid not null references conversations(id) on delete cascade,
  id_meta             text,                                -- vide tant que le message n'est pas parti
  sens                sens_message not null,
  type_message        text not null default 'text',
  texte               text,
  delai_traitement_ms integer,
  cree_le             timestamptz not null default now(),
  unique (commerce_id, id_meta)
);

create table commandes (
  id              uuid primary key default gen_random_uuid(),
  commerce_id     uuid not null references commerces(id) on delete cascade,
  contact_id      uuid not null references contacts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  details         jsonb not null,                         -- produit, quantite, adresse
  statut          statut_commande not null default 'nouvelle',
  cree_le         timestamptz not null default now(),
  mis_a_jour_le   timestamptz not null default now()
);

create table evenements (
  id              bigint generated always as identity primary key,
  commerce_id     uuid not null references commerces(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  type            type_evenement not null,
  detail          jsonb not null default '{}',
  cree_le         timestamptz not null default now()
);

create table modeles_messages (
  id          uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commerces(id) on delete cascade,
  nom         text not null,
  langue      text not null default 'fr',
  statut      statut_modele not null default 'en_attente',
  unique (commerce_id, nom, langue)
);
