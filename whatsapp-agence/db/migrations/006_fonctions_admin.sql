-- Migration 006 : fonctions pour le workflow admin interne et les rapports.
-- Appelées par n8n/workflows/03-api-interne.json et la tâche planifiée "rapport mensuel".

-- Active une nouvelle version de fiche pour un commerce (numéro de version automatique),
-- et désactive l'ancienne. Une seule transaction : jamais deux fiches actives à la fois.
create or replace function activer_fiche(p_commerce_id uuid, p_contenu text, p_validee_par text)
returns uuid language plpgsql as $$
declare v_version int; v_id uuid;
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);

  select coalesce(max(version), 0) + 1 into v_version from fiches where commerce_id = p_commerce_id;

  insert into fiches (commerce_id, version, contenu, active, validee_le, validee_par)
  values (p_commerce_id, v_version, p_contenu, false, now(), p_validee_par)
  returning id into v_id;

  update fiches set active = false where commerce_id = p_commerce_id and id <> v_id;
  update fiches set active = true where id = v_id;

  return v_id;
end;
$$;

-- Change le statut d'une commande (nouvelle/confirmee/livree/annulee).
create or replace function changer_statut_commande(p_commerce_id uuid, p_commande_id uuid, p_statut statut_commande)
returns void language plpgsql as $$
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);
  update commandes set statut = p_statut, mis_a_jour_le = now()
  where id = p_commande_id and commerce_id = p_commerce_id;
end;
$$;

-- Rend la main au robot sur une conversation précise (reprise manuelle, ex. depuis l'admin interne).
create or replace function rendre_la_main_au_robot(p_commerce_id uuid, p_conversation_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);
  update conversations set etat = 'menu', humain_depuis = null
  where id = p_conversation_id and commerce_id = p_commerce_id;

  insert into evenements (commerce_id, conversation_id, type, detail)
  values (p_commerce_id, p_conversation_id, 'reprise', '{"origine": "manuelle"}'::jsonb);
end;
$$;

-- Rend la main au robot sur la conversation la plus récemment mise en pause pour ce commerce.
-- Utilisé quand le patron envoie le mot "reprise" directement par WhatsApp (App Flow section 3),
-- sans préciser de quelle conversation il s'agit : on reprend la plus ancienne en pause (FIFO),
-- une limite connue du MVP (voir docs/EXPLOITATION.md).
create or replace function rendre_la_main_derniere_pause(p_commerce_id uuid)
returns uuid language plpgsql as $$
declare v_conversation_id uuid;
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);

  select id into v_conversation_id
  from conversations
  where commerce_id = p_commerce_id and etat = 'humain'
  order by humain_depuis asc
  limit 1;

  if v_conversation_id is not null then
    update conversations set etat = 'menu', humain_depuis = null where id = v_conversation_id;
    insert into evenements (commerce_id, conversation_id, type, detail)
    values (p_commerce_id, v_conversation_id, 'reprise', '{"origine": "mot_cle_patron"}'::jsonb);
  end if;

  return v_conversation_id;
end;
$$;

-- Rapport mensuel par commerce (PRD section 9, étape 6 ; TRD section 10).
create or replace function generer_rapport_mensuel(p_commerce_id uuid, p_mois date default date_trunc('month', now()))
returns jsonb language plpgsql as $$
declare v_result jsonb;
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);

  select jsonb_build_object(
    'commerce_id', p_commerce_id,
    'mois', to_char(p_mois, 'YYYY-MM'),
    'messages_entrants', (
      select count(*) from messages
      where commerce_id = p_commerce_id and sens = 'entrant'
        and cree_le >= date_trunc('month', p_mois) and cree_le < date_trunc('month', p_mois) + interval '1 month'
    ),
    'commandes', (
      select count(*) from commandes
      where commerce_id = p_commerce_id
        and cree_le >= date_trunc('month', p_mois) and cree_le < date_trunc('month', p_mois) + interval '1 month'
    ),
    'transferts', (
      select count(*) from evenements
      where commerce_id = p_commerce_id and type = 'transfert'
        and cree_le >= date_trunc('month', p_mois) and cree_le < date_trunc('month', p_mois) + interval '1 month'
    ),
    'questions_sans_reponse', (
      select count(*) from evenements
      where commerce_id = p_commerce_id and type = 'transfert'
        and detail->>'raison' = 'information_absente'
        and cree_le >= date_trunc('month', p_mois) and cree_le < date_trunc('month', p_mois) + interval '1 month'
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Seuils d'alerte de plafond (TRD section 10) : commerces à 80% ou plus de leur plafond mensuel.
create or replace function commerces_proches_du_plafond(p_seuil numeric default 0.8)
returns table(commerce_id uuid, nom text, numero_patron text, phone_number_id text, plafond integer, utilise bigint)
language sql as $$
  select c.id, c.nom, c.numero_patron, c.phone_number_id, c.plafond_conversations, conversations_du_mois(c.id)
  from commerces c
  where c.plafond_conversations is not null
    and conversations_du_mois(c.id) >= c.plafond_conversations * p_seuil;
$$;
