-- Migration 005 : fonctions métier appelées par n8n et par les tâches planifiées
-- Source : Schéma backend – Agence d'automatisation WhatsApp/IA, sections 6, 7 et 8.
--
-- Ces fonctions encapsulent le SQL du dossier pour que les workflows n8n n'aient
-- qu'un seul appel à faire. Elles s'exécutent avec les droits du rôle flux_n8n,
-- donc toujours après avoir fixé app.commerce_id (sauf les fonctions planifiées
-- qui parcourent plusieurs commerces et s'exécutent avec admin_agence).

-- Fixe le commerce courant pour la transaction (isolation par ligne).
-- À appeler en tout premier, juste après avoir retrouvé le commerce par phone_number_id.
create or replace function fixer_commerce_courant(p_commerce_id uuid)
returns void language sql as $$
  select set_config('app.commerce_id', p_commerce_id::text, true);
$$;

-- Les 10 derniers messages d'une conversation, pour la requête envoyée à l'IA.
create or replace function historique_conversation(p_conversation_id uuid, p_limite int default 10)
returns table(sens sens_message, texte text, cree_le timestamptz) language sql stable as $$
  select sens, texte, cree_le
  from messages
  where conversation_id = p_conversation_id
  order by cree_le desc
  limit p_limite;
$$;

-- Nombre de conversations distinctes ce mois-ci pour un commerce (comptage du plafond).
create or replace function conversations_du_mois(p_commerce_id uuid)
returns bigint language sql stable as $$
  select count(distinct conversation_id)
  from messages
  where commerce_id = p_commerce_id
    and sens = 'entrant'
    and cree_le >= date_trunc('month', now());
$$;

-- Reprise automatique du robot après 12 heures sans activité humaine.
-- À appeler par la tâche planifiée "reprise", avec le rôle admin_agence (toutes commerces).
create or replace function reprendre_conversations_inactives()
returns setof uuid language sql as $$
  update conversations
  set etat = 'menu', humain_depuis = null
  where etat = 'humain'
    and humain_depuis < now() - interval '12 hours'
  returning id;
$$;

-- Purge quotidienne des anciens messages (rétention par défaut : 90 jours).
create or replace function purger_anciens_messages(p_jours int default 90)
returns bigint language plpgsql as $$
declare v_nombre bigint;
begin
  delete from messages where cree_le < now() - (p_jours || ' days')::interval;
  get diagnostics v_nombre = row_count;
  return v_nombre;
end;
$$;

-- Effacement d'un contact à sa demande (cascade vers conversations, messages, commandes).
-- SECURITY DEFINER : le rôle flux_n8n n'a volontairement que select/insert/update
-- (migration 004), jamais delete, pour limiter les dégâts d'un flux qui se tromperait.
-- Cette unique fonction s'exécute donc avec les droits de son propriétaire
-- (admin_agence) quel que soit l'appelant, pour que la demande d'effacement RGPD
-- (déclenchée par le workflow admin interne, protégé par ADMIN_API_KEY) fonctionne
-- sans donner au flux principal un accès delete général sur les tables.
create or replace function effacer_contact(p_commerce_id uuid, p_numero text)
returns void language sql security definer set search_path = public as $$
  delete from contacts where commerce_id = p_commerce_id and numero = p_numero;
$$;
