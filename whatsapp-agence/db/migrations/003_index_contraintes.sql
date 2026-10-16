-- Migration 003 : index de performance
-- Source : Schéma backend – Agence d'automatisation WhatsApp/IA, section 4.

-- une seule fiche active par commerce
create unique index fiches_une_active on fiches (commerce_id) where active;

-- les 10 derniers messages d'une conversation
create index messages_conversation on messages (conversation_id, cree_le desc);

-- la liste des commandes du patron, par statut
create index commandes_commerce_statut on commandes (commerce_id, statut, cree_le desc);

-- le journal et le rapport mensuel
create index evenements_commerce on evenements (commerce_id, cree_le desc);

-- les conversations en pause a reprendre
create index conversations_humain on conversations (humain_depuis) where etat = 'humain';
