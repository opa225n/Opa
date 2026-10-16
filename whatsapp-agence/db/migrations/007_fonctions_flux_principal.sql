-- Migration 007 : fonctions appelées par le workflow n8n principal
-- (n8n/workflows/01-reception-whatsapp.json), une fonction = un seul aller-retour
-- réseau et une seule transaction, pour que app.commerce_id (RLS) reste valable
-- du début à la fin du traitement même si le pool de connexions change de session
-- entre deux appels de nœuds n8n (voir Schéma backend, section 5).

-- Traite un message entrant : upsert contact, upsert conversation, anti-doublon
-- sur id_meta, charge la fiche active et les 10 derniers messages.
create or replace function traiter_message_entrant(
  p_commerce_id uuid,
  p_numero      text,
  p_nom_profil  text,
  p_id_meta     text,
  p_type        text,
  p_texte       text
) returns jsonb language plpgsql as $$
declare
  v_contact_id      uuid;
  v_conversation_id uuid;
  v_etat_avant      etat_conversation;
  v_message_id      uuid;
  v_nouveau_message boolean := true;
  v_etat            etat_conversation;
  v_contexte        jsonb;
  v_humain_depuis   timestamptz;
  v_fiche           record;
  v_historique      jsonb;
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);

  insert into contacts (commerce_id, numero, nom)
  values (p_commerce_id, p_numero, p_nom_profil)
  on conflict (commerce_id, numero) do update set nom = coalesce(contacts.nom, excluded.nom)
  returning id into v_contact_id;

  insert into conversations (commerce_id, contact_id)
  values (p_commerce_id, v_contact_id)
  on conflict (contact_id) do nothing;

  select etat into v_etat_avant from conversations where contact_id = v_contact_id;

  insert into messages (commerce_id, conversation_id, id_meta, sens, type_message, texte)
  select p_commerce_id, id, p_id_meta, 'entrant', p_type, p_texte
  from conversations where contact_id = v_contact_id
  on conflict (commerce_id, id_meta) do nothing
  returning id into v_message_id;

  v_nouveau_message := (v_message_id is not null);

  select id into v_conversation_id from conversations where contact_id = v_contact_id;

  if v_nouveau_message then
    update conversations
    set dernier_message_client_le = now(),
        dernier_message_le = now(),
        etat = case when etat = 'termine' then 'menu' else etat end
    where id = v_conversation_id;
  end if;

  select etat, contexte, humain_depuis into v_etat, v_contexte, v_humain_depuis
  from conversations where id = v_conversation_id;

  select version, contenu into v_fiche from fiches where commerce_id = p_commerce_id and active limit 1;

  select coalesce(jsonb_agg(jsonb_build_object('sens', sens, 'texte', texte, 'cree_le', cree_le) order by cree_le desc), '[]'::jsonb)
  into v_historique
  from (
    select sens, texte, cree_le from messages
    where conversation_id = v_conversation_id
    order by cree_le desc
    limit 10
  ) derniers;

  return jsonb_build_object(
    'nouveau_message', v_nouveau_message,
    'contact_id', v_contact_id,
    'conversation_id', v_conversation_id,
    'est_premier_message', (v_etat_avant is null or v_etat_avant = 'nouveau'),
    'etat', v_etat,
    'contexte', v_contexte,
    'humain_depuis', v_humain_depuis,
    'fiche_version', v_fiche.version,
    'fiche_contenu', v_fiche.contenu,
    'historique', v_historique
  );
end;
$$;

-- Enregistre le message d'accueil (premier contact) et fixe l'état à 'menu'.
create or replace function enregistrer_accueil(p_commerce_id uuid, p_conversation_id uuid, p_texte_accueil text)
returns void language plpgsql as $$
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);

  update conversations set etat = 'menu', dernier_message_le = now() where id = p_conversation_id;

  insert into messages (commerce_id, conversation_id, sens, type_message, texte)
  values (p_commerce_id, p_conversation_id, 'sortant', 'text', p_texte_accueil);
end;
$$;

-- Applique le résultat de l'IA + machine à états : met à jour la conversation,
-- enregistre la réponse sortante, et crée la commande/l'événement si besoin.
-- Un seul appel = une seule transaction, pour ne jamais enregistrer la réponse
-- sans mettre à jour l'état (ou l'inverse).
create or replace function appliquer_reponse_ia(
  p_commerce_id              uuid,
  p_conversation_id          uuid,
  p_contact_id               uuid,
  p_nouvel_etat              etat_conversation,
  p_contexte                 jsonb,
  p_texte_sortant            text,
  p_creer_commande           boolean,
  p_details_commande         jsonb,
  p_creer_evenement_transfert boolean,
  p_raison_transfert         text,
  p_creer_evenement_injection boolean default false
) returns jsonb language plpgsql as $$
declare v_message_id uuid; v_commande_id uuid;
begin
  perform set_config('app.commerce_id', p_commerce_id::text, true);

  update conversations
  set etat = p_nouvel_etat,
      contexte = p_contexte,
      dernier_message_le = now(),
      humain_depuis = case when p_nouvel_etat = 'humain' and humain_depuis is null then now()
                           when p_nouvel_etat <> 'humain' then null
                           else humain_depuis end
  where id = p_conversation_id;

  insert into messages (commerce_id, conversation_id, sens, type_message, texte)
  values (p_commerce_id, p_conversation_id, 'sortant', 'text', p_texte_sortant)
  returning id into v_message_id;

  if p_creer_commande then
    insert into commandes (commerce_id, contact_id, conversation_id, details)
    values (p_commerce_id, p_contact_id, p_conversation_id, p_details_commande)
    returning id into v_commande_id;
  end if;

  if p_creer_evenement_transfert then
    insert into evenements (commerce_id, conversation_id, type, detail)
    values (p_commerce_id, p_conversation_id, 'transfert', jsonb_build_object('raison', p_raison_transfert));
  end if;

  if p_creer_evenement_injection then
    insert into evenements (commerce_id, conversation_id, type, detail)
    values (p_commerce_id, p_conversation_id, 'injection', jsonb_build_object('raison', p_raison_transfert));
  end if;

  return jsonb_build_object('message_id', v_message_id, 'commande_id', v_commande_id);
end;
$$;
