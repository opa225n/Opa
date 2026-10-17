# Tontine — application de gestion de tontines

Application construite à partir du dossier projet (PRD, App Flow, UI/UX Design, TRD, Schéma
back-end, Plan de déploiement) partagé par l'utilisateur. Elle couvre le parcours MVP complet :
inscription, création d'une tontine, invitations, tirage au sort de l'ordre des tours, lancement
du cycle, cotisations par Mobile Money, pénalités de retard, décisions du président, versement
automatique du pot, historique et notifications.

## Écart assumé par rapport au TRD : PWA plutôt que Flutter natif

Le TRD recommandait Flutter + NestJS. Cet environnement de développement n'a ni SDK Flutter ni
émulateur mobile : un projet Flutter n'aurait pas pu être compilé, lancé ni testé ici. J'ai donc
construit le **front mobile comme une PWA installable** (HTML/CSS/JS, sans framework, cohérente
avec les autres apps du dépôt comme `tontine/` ou `whatsapp-agence/`), ce qui permet de la lancer,
la tester réellement dans un navigateur (y compris mobile, via Playwright) et de la déployer
immédiatement. L'API, le schéma de données, la logique métier et la machine à états respectent
fidèlement le TRD et le schéma back-end. Si une vraie app Flutter est souhaitée par la suite, l'API
reste identique : seul le client change.

## Architecture

```
tontine-pro/
├─ apps/
│  ├─ api/      API REST (Node.js + TypeScript + Express + Prisma + PostgreSQL)
│  └─ web/      PWA mobile (HTML/CSS/JS vanille, sans build, routeur par hash)
└─ README.md
```

### Backend (`apps/api`)

- **Express + TypeScript**, organisé en modules comme le prévoit le TRD : `auth`, `users`,
  `tontines`, `rounds`, `contributions`, `payments`, `payouts`, `ledger`, `notifications`, `audit`.
- **PostgreSQL** via **Prisma** — schéma fidèle au document « Schéma back-end » : `users`,
  `tontines`, `memberships`, `invitations`, `rounds`, `contributions`, `payments`, `payouts`,
  `webhook_events`, `ledger_entries`, `audit_log`, `notifications`, `otp_codes`.
- **Grand livre en écritures seules** : chaque mouvement d'argent écrit une transaction équilibrée
  (Σdébits = Σcrédits) dans `ledger_entries`, jamais modifiée ensuite — vérifié par
  `writeLedgerTransaction`, et par le test de bout en bout (`sum(debit) = sum(credit)` par
  transaction).
- **Machine à états des tours** : `planned → open → complete → payout_pending → paid_out` (+
  `closed` si le président clôture avec des absents), comme décrit dans le TRD.
- **Fournisseurs simulés** (`src/providers/`) : pas de vrai agrégateur Mobile Money ni de vrai
  SMS — conformément à ce que le plan de déploiement prévoit pour l'environnement local
  (« simulateurs paiement/SMS »). Un paiement simulé réussit après 2-4 s via un faux webhook signé
  (même flux asynchrone qu'un vrai agrégateur) ; un numéro Mobile Money terminant par `0000` simule
  un échec, pour tester ce parcours.
- **OTP** : code à 6 chiffres, haché, expire en 5 min, 5 tentatives max. En dev
  (`OTP_DEV_ECHO=true`), le code est renvoyé dans la réponse pour pouvoir tester sans vrai SMS — ne
  jamais activer ça en production.
- **Jobs planifiés** (`src/jobs/scheduler.ts`) : passage en retard + calcul de la pénalité après le
  délai de grâce, rappels avant échéance. En production ce serait des workers BullMQ/Redis séparés
  (prévu dans le TRD) ; ici un `setInterval` suffit pour la démo mono-instance.

Non implémenté dans cette passe (clairement hors du MVP d'après la roadmap du PRD, ou secondaire
pour une démo) : back-office web (B01-B08), tontine à enchères/épargne (V2), micro-crédit (V3),
génération de PDF pour les reçus (le reçu existe en JSON, affiché dans l'app), envoi WhatsApp réel,
vraie intégration agrégateur/SMS.

### Frontend (`apps/web`)

PWA mobile-first sans build, avec :
- `src/styles/tokens.css` — tokens du design system (couleurs hex, typographie Inter/Sora, grille
  4/8dp) copiés depuis le document UI/UX.
- `src/styles/components.css` — composants (bouton, carte, pot du tour, badge de statut, nav basse,
  etc.) conformes aux specs (rayons, zones tactiles 48dp, pas d'ombre lourde).
- `src/router.js` — routeur par hash minimal.
- `src/screens/*.js` — un fichier par groupe d'écrans, repris des parcours P1 à P6 du document App
  Flow : `auth.js` (P1), `home.js`, `createTontine.js` + `join.js` (P2/P3), `tontineDetail.js` +
  `roundDetail.js` (P4/P5 : calendrier, paiement, décisions du président, versement), `history.js`,
  `notifications.js`, `profile.js`.
- Installable (`manifest.json` + `sw.js`), montants toujours en FCFA, numéros masqués sauf pour
  leur titulaire (ex. `+225 07 ** ** 45`), aucune donnée financière mise en cache hors-ligne.

## Lancer en local

Prérequis déjà présents dans cet environnement : Node 22, PostgreSQL 16, Redis.

```bash
# 1) Base de données (si pas déjà fait)
service postgresql start
su postgres -c "createdb tontine"   # si elle n'existe pas encore

# 2) API
cd apps/api
npm install
cp .env.example .env   # ou réutiliser le .env fourni (dev uniquement)
npx prisma migrate deploy
npm run dev             # http://localhost:4000

# 3) App mobile (autre terminal)
cd apps/web
python3 -m http.server 8090   # http://localhost:8090
```

Ouvrez `http://localhost:8090` dans un navigateur (idéalement en mode mobile/responsive). Chaque
nouvel utilisateur se connecte avec un numéro de téléphone ; en dev, le code reçu par SMS est aussi
affiché à l'écran (bandeau « Mode démo »).

### Script de test de bout en bout

`apps/api/scripts/smoke-test.sh` rejoue tout le flux backend via curl (OTP → création → invitations
→ lancement → paiements → versement) et vérifie que le grand livre est équilibré. Un parcours
complet dans le navigateur (Playwright, 3 utilisateurs, viewport mobile 390×844) a aussi été exécuté
pour valider visuellement chaque écran.

## Variables d'environnement (`apps/api/.env`)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signature des jetons (à changer en prod) |
| `OTP_DEV_ECHO` | `true` en dev seulement : renvoie le code OTP dans la réponse API |
| `SIMULATE_PROVIDERS` | Toujours `true` ici (pas d'agrégateur réel connecté) |

## Prochaines étapes suggérées

1. Brancher un vrai agrégateur Mobile Money derrière l'interface `PaymentProvider` existante
   (`src/providers/payments/types.ts`) — le code métier (ledger, tours, notifications) n'a pas à
   changer.
2. Ajouter le back-office web (Next.js, comme prévu au TRD) pour la modération et les litiges.
3. Génération de reçus en PDF + envoi WhatsApp réel pour les invitations/rappels.
4. Si une app native est requise : construire un client Flutter contre cette même API (contrat
   REST `/v1/...` déjà stable), ou envisager Capacitor pour empaqueter cette PWA existante en
   binaire iOS/Android sans réécrire l'interface.
