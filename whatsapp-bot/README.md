# Assistant WhatsApp multi-commerces

Un seul serveur, une fiche JSON par commerce. Chaque message reçu sur le numéro WhatsApp d'un commerce est traité avec les informations de **ce** commerce (prix, horaires, adresse), via l'API Claude.

## Fonctionnement
- `POST /webhook` reçoit les messages Meta (signature `X-Hub-Signature-256` vérifiée), répond vite, traite en arrière-plan.
- Le commerce est identifié par `phone_number_id` (fiche dans `tenants/`).
- Historique par client (20 derniers messages), anti-doublons.
- **Réclamation / hors périmètre** : le bot envoie la phrase de transfert, se tait pour ce client, et prévient le responsable (`owner_phone`).
- **Commande confirmée** : enregistrée dans `data/<commerce>.orders.jsonl` et envoyée au responsable.

## Production
- `DATABASE_URL` : Postgres (tables créées automatiquement au démarrage, voir `db/schema.sql`). Sans cette variable, repli sur des fichiers (dev uniquement).
- `ADMIN_TOKEN` : active le tableau de bord `https://votre-domaine/admin` (liste des commandes, bouton « prête + prévenir le client »).
- `Dockerfile` fourni (Railway, Render, Fly.io…). Démarrage : `node server.js`, port `PORT`.
- Message « commande prête » : à soumettre dans Meta (WhatsApp Manager → Modèles), catégorie *Utilitaire*, langue `fr`, nom `commande_prete`, corps :
  `Bonjour {{1}}, votre commande chez {{2}} est prête. Merci de votre confiance !`
  Le nom se règle par commerce dans `ready_template` de la fiche ; sans cette clé, un texte libre est envoyé (valable seulement dans les 24 h suivant le dernier message du client).
- Test Postgres : `TEST_DATABASE_URL=postgres://… npm test`.

## Démarrage
```bash
cp .env.example .env     # puis remplir les clés
set -a; . ./.env; set +a
npm run chat             # tester l'assistant dans le terminal
npm start                # lancer le serveur (webhook sur /webhook)
npm test
```
Seule dépendance : `pg` (Node ≥ 20).

## Installer un nouveau client (≈ 1-2 h)
1. Numéro dédié non utilisé sur l'appli WhatsApp classique.
2. Compte WhatsApp Business (API Cloud Meta) + vérification de l'entreprise ; relever le **Phone number ID**.
3. Copier `tenants/pressing-eclat.json` en `tenants/<client>.json` et remplir : `phone_number_id`, `owner_phone` (format `225…`), nom, horaires, adresse, tarifs, délais, paiement, `extra_rules`.
4. Dans Meta Developers → WhatsApp → Configuration : URL du webhook `https://votre-domaine/webhook`, jeton = `WHATSAPP_VERIFY_TOKEN`, abonner le champ `messages`.
5. Redémarrer le serveur, tester avec `npm run chat`, puis par un vrai message.

## À prévoir avant la production
- Hébergement HTTPS permanent (Railway, Render, VPS…).
- Renseigner `WHATSAPP_APP_SECRET` (sinon la signature n'est pas vérifiée).
- Les alertes au responsable (`owner_phone`) sont aussi soumises à la fenêtre de 24 h de Meta : le responsable doit écrire au numéro du bot au moins une fois par jour, ou prévoir un modèle dédié.
