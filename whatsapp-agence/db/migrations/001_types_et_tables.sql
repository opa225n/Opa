-- Migration 001 : types et tables de référence
-- Source : Schéma backend – Agence d'automatisation WhatsApp/IA, section 3.

create extension if not exists pgcrypto;

create type forfait           as enum ('essentiel', 'commerce', 'sur_mesure');
create type statut_commerce   as enum ('essai', 'actif', 'suspendu', 'resilie');
create type etat_conversation as enum ('nouveau', 'menu', 'question', 'commande', 'confirmation', 'humain', 'termine');
create type sens_message      as enum ('entrant', 'sortant');
create type statut_commande   as enum ('nouvelle', 'confirmee', 'livree', 'annulee');
create type type_evenement    as enum ('transfert', 'reprise', 'erreur', 'injection', 'relance', 'alerte_patron');
create type statut_modele     as enum ('en_attente', 'approuve', 'refuse');

create table commerces (
  id                    uuid primary key default gen_random_uuid(),
  nom                   text not null,
  numero_whatsapp       text not null unique,   -- format E.164
  phone_number_id       text not null unique,   -- identifiant du numero chez Meta
  numero_patron         text not null,
  forfait               forfait not null default 'essentiel',
  statut                statut_commerce not null default 'essai',
  plafond_conversations integer,                -- par mois, selon le forfait
  cree_le               timestamptz not null default now()
);

create table fiches (
  id          uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commerces(id) on delete cascade,
  version     integer not null,
  contenu     text not null,
  active      boolean not null default false,
  validee_le  timestamptz,
  validee_par text,
  unique (commerce_id, version)
);

create table contacts (
  id                 uuid primary key default gen_random_uuid(),
  commerce_id        uuid not null references commerces(id) on delete cascade,
  numero             text not null,
  nom                text,
  premier_message_le timestamptz not null default now(),
  unique (commerce_id, numero)
);
