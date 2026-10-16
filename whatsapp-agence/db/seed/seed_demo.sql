-- Jeu de données de démo : un commerce fictif pour tester le flux avant le premier vrai client.
-- Remplacez le numéro de test Meta et le phone_number_id par ceux fournis dans votre app Meta
-- (Développeurs Meta > WhatsApp > Démarrer, numéro de test).

insert into commerces (id, nom, numero_whatsapp, phone_number_id, numero_patron, forfait, statut, plafond_conversations)
values (
  '00000000-0000-0000-0000-000000000001',
  'Boutique Démo',
  '+2250000000000',        -- à remplacer par le numéro de test fourni par Meta
  'REMPLACER_PHONE_NUMBER_ID',
  '+2250700000000',        -- numéro du "patron" pour les alertes
  'commerce',
  'essai',
  300
);

insert into fiches (commerce_id, version, contenu, active, validee_le, validee_par)
values (
  '00000000-0000-0000-0000-000000000001',
  1,
  $$Nom du commerce : Boutique Démo
Horaires : du lundi au samedi, de 8h à 19h. Fermé le dimanche.
Adresse : Cocody, Riviera 2, Abidjan.
Livraison : dans tout Abidjan, 1000 FCFA, livraison le jour même avant 15h.
Paiement : à la livraison, en espèces ou Mobile Money.
Produits et prix :
- Baskets homme/femme : 15 000 FCFA la paire
- Sacs à dos : 10 000 FCFA
- T-shirts : 5 000 FCFA
Politique de retour : échange possible sous 48h si le produit n'est pas porté.
Ton souhaité : chaleureux, simple, phrases courtes, toujours proposer un humain en cas de doute.
$$,
  true,
  now(),
  'démo'
);

insert into contacts (id, commerce_id, numero, nom)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '+2250700000001',
  'Client test'
);

insert into conversations (commerce_id, contact_id, etat)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'nouveau'
);
