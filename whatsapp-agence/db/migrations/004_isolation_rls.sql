-- Migration 004 : isolation par ligne (Row Level Security) et rôles
-- Source : Schéma backend – Agence d'automatisation WhatsApp/IA, section 5.
--
-- Exécuter cette migration en tant que superutilisateur ou propriétaire de la base.
-- Les mots de passe des rôles sont fixés séparément via ALTER ROLE ... WITH PASSWORD,
-- jamais en clair dans ce fichier (voir docs/DEPLOIEMENT.md).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'admin_agence') then
    create role admin_agence with login;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'flux_n8n') then
    create role flux_n8n with login;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['fiches','contacts','conversations','messages','commandes','evenements','modeles_messages'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy isolation_commerce on %I
      using (commerce_id = nullif(current_setting('app.commerce_id', true), '')::uuid)
      with check (commerce_id = nullif(current_setting('app.commerce_id', true), '')::uuid)$p$, t);
  end loop;
end $$;

grant select on commerces to flux_n8n;
grant select, insert, update on fiches, contacts, conversations, messages, commandes, modeles_messages to flux_n8n;
grant select, insert on evenements to flux_n8n;
