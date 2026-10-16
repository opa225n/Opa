# Déploiement — de zéro à un premier message qui répond

Ce guide suit l'ordre du **Plan d'implémentation, phases 0 et 1**. Chaque
étape a un critère de réussite clair ; ne passez à la suivante que si le
critère est rempli (règle du plan : « on n'ouvre la phase suivante que si la
précédente est vérifiée »).

## Phase 0 — Comptes et accès (aucun code)

1. **Compte Meta Business** : créez-en un sur
   [business.facebook.com](https://business.facebook.com) et lancez la
   vérification de l'entreprise (peut prendre plusieurs jours — à lancer tôt).
2. **Application Meta** : sur
   [developers.facebook.com](https://developers.facebook.com), créez une
   application de type « Entreprise », ajoutez le produit **WhatsApp**.
3. Dans l'app, onglet WhatsApp > Démarrer : notez
   - le **jeton d'accès temporaire** (puis, avant la mise en ligne réelle,
     générez un **jeton permanent** via un utilisateur système — le jeton
     temporaire expire en 24 h) → `META_WHATSAPP_TOKEN`
   - le **`phone_number_id`** du numéro de test → à utiliser dans
     `db/seed/seed_demo.sql`
   - le **secret de l'application** (Paramètres de l'app > De base) →
     `META_APP_SECRET`
4. Choisissez vous-même un **jeton de vérification** (une chaîne secrète au
   choix) → `META_VERIFY_TOKEN` ; vous le ressaisirez à l'étape 7.
5. **Compte Anthropic** : créez une clé API sur
   [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`,
   et fixez tout de suite un plafond de dépense mensuel dans les paramètres de
   facturation (TRD section 12).
6. **Serveur (VPS)** : un petit serveur Linux (1 à 2 Go de RAM suffisent pour
   démarrer) avec Docker et Docker Compose installés, et un nom de domaine
   pointant vers son IP (nécessaire pour le HTTPS — Meta refuse les webhooks
   en HTTP simple).

**Sortie de phase 0 :** vous avez les 5 valeurs ci-dessus en lieu sûr
(gestionnaire de mots de passe), jamais dans un fichier versionné.

## Phase 1 — Infrastructure

### 1. Préparer le serveur

```bash
# Sur le VPS, en tant qu'utilisateur non-root avec accès sudo :
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # puis se reconnecter
```

Mettez un reverse proxy devant n8n pour le HTTPS. Le plus simple est
[Caddy](https://caddyserver.com/) (certificat automatique) :

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile` :

```
votre-domaine.com {
  reverse_proxy localhost:5678
}
```

```bash
sudo systemctl reload caddy
```

### 2. Récupérer le projet et configurer les secrets

```bash
git clone <url-de-votre-depot> agence-whatsapp
cd agence-whatsapp/whatsapp-agence
cp .env.example .env
```

Remplissez **`.env`** avec les valeurs de la phase 0 (`META_*`,
`ANTHROPIC_API_KEY`), `N8N_HOST` (votre domaine), et générez les secrets
restants :

```bash
openssl rand -hex 32   # -> N8N_ENCRYPTION_KEY
openssl rand -hex 24   # -> ADMIN_API_KEY
openssl rand -base64 24   # -> POSTGRES_PASSWORD, POSTGRES_APP_PASSWORD, N8N_BASIC_AUTH_PASSWORD (un par ligne, différents)
```

### 3. Démarrer les conteneurs

```bash
docker compose up -d
docker compose ps   # les deux services doivent être "healthy"/"running"
```

### 4. Créer le schéma et les rôles

```bash
# Rôle admin_agence : mot de passe différent de celui défini dans .env pour
# POSTGRES_PASSWORD si vous utilisez un rôle superutilisateur distinct, ou
# réutilisez POSTGRES_USER/POSTGRES_PASSWORD s'il s'appelle déjà admin_agence
# (c'est le cas par défaut dans ce projet).
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/001_types_et_tables.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/002_conversations_messages_commandes.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/003_index_contraintes.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/004_isolation_rls.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/005_fonctions_metier.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/006_fonctions_admin.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/007_fonctions_flux_principal.sql
```

Fixez le mot de passe du rôle applicatif (celui que n8n utilisera) :

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "alter role flux_n8n with password '<POSTGRES_APP_PASSWORD de votre .env>';"
```

Insérez le commerce de démonstration (après avoir remplacé le
`phone_number_id` dans le fichier par celui de votre numéro de test Meta) :

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/seed/seed_demo.sql
```

**Test d'isolation (Schéma backend, section 9, à faire avant tout client
réel) :** insérez un deuxième faux commerce avec un autre `phone_number_id`,
puis vérifiez dans une session `psql` que `set_config('app.commerce_id', ...)`
sur le premier commerce ne renvoie jamais les lignes du second.

### 5. Configurer n8n

1. Ouvrez `https://votre-domaine.com` → écran de connexion n8n (identifiants
   `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`).
2. **Credentials > Add Credential > Postgres**, nommez-la exactement
   **`Postgres - Agence WhatsApp`** avec :
   - Host : `postgres` (nom du service Docker), Port `5432`
   - Database : valeur de `POSTGRES_DB`
   - User : `flux_n8n`, Password : valeur de `POSTGRES_APP_PASSWORD`
3. Créez une **deuxième** credential Postgres, **`Postgres - Agence WhatsApp (admin)`**,
   avec `POSTGRES_USER` / `POSTGRES_PASSWORD` (rôle `admin_agence`) — utilisée
   uniquement par le workflow `02-taches-planifiees.json` (voir la note dans
   ce workflow : les tâches planifiées parcourent tous les commerces et ont
   besoin de contourner l'isolation par ligne).
4. **Importez les trois workflows** (menu ⋮ > Import from File) :
   `n8n/workflows/01-reception-whatsapp.json`,
   `02-taches-planifiees.json`, `03-api-interne.json`.
5. Dans **chaque** nœud Postgres de chaque workflow, sélectionnez la
   credential correspondante (`Postgres - Agence WhatsApp` pour le workflow 01
   et 03, `(admin)` pour le workflow 02) — l'import ne la présélectionne pas.
6. Activez (toggle « Active ») les trois workflows.

### 6. Brancher le webhook chez Meta

Dans l'app Meta > WhatsApp > Configuration :
- URL de rappel : `https://votre-domaine.com/webhook/whatsapp`
- Jeton de vérification : la valeur de `META_VERIFY_TOKEN`
- Abonnez le champ **`messages`**.

**Problème connu :** ce dossier expose le chemin `/webhook/whatsapp` en POST
dans le workflow 01. La vérification GET de Meta (lors de l'enregistrement de
l'URL) doit être traitée par un nœud Webhook GET séparé sur le même chemin —
ajoutez-en un dans n8n si l'écran de configuration Meta renvoie une erreur de
vérification (Webhook GET → vérifier `hub.verify_token` dans les paramètres
de requête → répondre `hub.challenge` en texte brut, code 200).

**Sortie de phase 1 :** un message WhatsApp envoyé depuis votre téléphone au
numéro de test apparaît dans la table `messages` (`select * from messages
order by cree_le desc limit 5;`) et vous recevez une réponse automatique.

## Sauvegardes (avant tout client réel)

```bash
# Sauvegarde quotidienne chiffrée (exemple de cron sur le VPS, hors des conteneurs) :
# crontab -e
0 2 * * * docker compose -f /chemin/vers/agence-whatsapp/whatsapp-agence/docker-compose.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gpg --symmetric --batch --passphrase-file /chemin/secret.pass \
  > /chemin/vers/sauvegardes/backup-$(date +%F).sql.gpg
```

Stockez le fichier chiffré **hors** du serveur de production (ex. copie vers
un autre serveur ou un stockage objet) et testez une restauration une fois
par mois (Schéma backend, section 8).

## Suite

Une fois la phase 1 validée : construisez et testez le flux couche par
couche (Plan d'implémentation, phase 2 — déjà codé dans ce dépôt, à tester
avec `docs/TESTS.md`), puis lancez le pilote avec votre premier commerce
(phase 3).
