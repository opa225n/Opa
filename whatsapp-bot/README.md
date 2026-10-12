# Assistant WhatsApp multi-commerces

Un seul serveur, une fiche JSON par commerce. Chaque message reçu sur le numéro WhatsApp d'un commerce est traité avec les informations de **ce** commerce (prix, horaires, adresse), via l'API Claude.

## Fonctionnement
- `POST /webhook` reçoit les messages Meta (signature `X-Hub-Signature-256` vérifiée), répond vite, traite en arrière-plan.
- Le commerce est identifié par `phone_number_id` (fiche dans `tenants/`).
- Historique par client (20 derniers messages), anti-doublons.
- **Réclamation / hors périmètre** : le bot envoie la phrase de transfert, se tait pour ce client, et prévient le responsable (`owner_phone`).
- **Commande confirmée** : enregistrée dans `data/<commerce>.orders.jsonl` et envoyée au responsable.

## Démarrage
```bash
cp .env.example .env     # puis remplir les clés
set -a; . ./.env; set +a
npm run chat             # tester l'assistant dans le terminal
npm start                # lancer le serveur (webhook sur /webhook)
npm test
```
Aucune dépendance (Node ≥ 20).

## Installer un nouveau client (≈ 1-2 h)
1. Numéro dédié non utilisé sur l'appli WhatsApp classique.
2. Compte WhatsApp Business (API Cloud Meta) + vérification de l'entreprise ; relever le **Phone number ID**.
3. Copier `tenants/pressing-eclat.json` en `tenants/<client>.json` et remplir : `phone_number_id`, `owner_phone` (format `225…`), nom, horaires, adresse, tarifs, délais, paiement, `extra_rules`.
4. Dans Meta Developers → WhatsApp → Configuration : URL du webhook `https://votre-domaine/webhook`, jeton = `WHATSAPP_VERIFY_TOKEN`, abonner le champ `messages`.
5. Redémarrer le serveur, tester avec `npm run chat`, puis par un vrai message.

## À prévoir avant la production
- Hébergement HTTPS permanent (Render, Railway, VPS…) avec `data/` sur disque persistant.
- Renseigner `WHATSAPP_APP_SECRET` (sinon la signature n'est pas vérifiée).
- Notification « commande prête » : Meta impose un **modèle de message approuvé** hors fenêtre de 24 h (non inclus, à ajouter).
- Pour plus de volume, remplacer `src/store.js` par une vraie base (SQLite/Postgres).
