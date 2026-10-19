# Tontine CI

Application web de gestion de tontines pour la Côte d'Ivoire et sa diaspora : cotisations,
calendrier des tours, paiements, rapports — avec traçabilité complète et sans jamais détenir
les fonds des utilisateurs.

Le nom "Tontine CI" est configurable via la variable d'environnement `NEXT_PUBLIC_APP_NAME`.

> **Statut : MVP fonctionnel.** La tontine rotative classique (section 5.A du cahier des
> charges) est entièrement implémentée et testée. Les autres types de tontines (épargne
> collective, cotisations variables, solidaire, caisse/prêts) ont leur schéma de données prêt
> mais pas encore d'interface dédiée — voir [Fonctionnalités restant à configurer](#fonctionnalités-restant-à-configurer).

## Sommaire

- [Stack technique](#stack-technique)
- [Installation locale](#installation-locale)
- [Compte de démonstration](#compte-de-démonstration)
- [Tests](#tests)
- [Fonctionnalités terminées](#fonctionnalités-terminées)
- [Fonctionnalités restant à configurer](#fonctionnalités-restant-à-configurer)
- [Architecture et modèle de données](#architecture-et-modèle-de-données)
- [Sécurité](#sécurité)
- [Intégrations externes (Mobile Money, SMS, WhatsApp, e-mail)](#intégrations-externes)
- [Déploiement](#déploiement)
- [Limites connues et risques de production](#limites-connues-et-risques-de-production)
- [Conformité](#conformité)

## Stack technique

| Composant | Choix | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.4 |
| Langage | TypeScript | 5 |
| UI | Tailwind CSS 4 + composants internes (style shadcn/ui) | — |
| Base de données | PostgreSQL | 16 |
| ORM | Prisma | 6.19 (voir note ci-dessous) |
| Authentification | Auth.js (NextAuth) v5, identifiants téléphone + mot de passe | 5.0-beta |
| Validation | Zod | 4 |
| Formulaires | React Hook Form | 7 |
| Tests unitaires/intégration | Vitest | 5 |
| Tests end-to-end | Playwright | 1.64 |

**Note sur Prisma** : la version 7+ de Prisma introduit un changement d'architecture majeur
(driver adapters obligatoires, configuration déplacée vers `prisma.config.ts`). Pour un MVP
stable et bien documenté, ce projet utilise volontairement la dernière version stable de la
branche 6.x, avec le schéma `datasource` classique.

**Note sur Next.js 16** : les Cache Components (mise en cache partielle du rendu) sont
**désactivés intentionnellement** dans `next.config.ts`. Cette application manipule des
données financières privées propres à chaque utilisateur connecté ; un cache de rendu
partagé serait un risque de fuite de données entre utilisateurs.

## Installation locale

### Prérequis

- Node.js ≥ 20.9
- PostgreSQL ≥ 14 (local ou Docker)

### Étapes

```bash
# 1. Installer les dépendances
npm install

# 2. Copier et compléter les variables d'environnement
cp .env.example .env
# Renseignez DATABASE_URL et générez un AUTH_SECRET :
#   openssl rand -base64 32

# 3. Créer la base de données (si elle n'existe pas déjà)
createdb tontine_ci   # ou via psql : CREATE DATABASE tontine_ci;

# 4. Appliquer les migrations
npx prisma migrate dev

# 5. (Optionnel mais recommandé) Charger le jeu de données de démonstration
npm run db:seed

# 6. Lancer le serveur de développement
npm run dev
```

L'application est accessible sur http://localhost:3000.

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarre le build de production |
| `npm run lint` | Analyse ESLint |
| `npm run test` | Tests unitaires et d'intégration (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) — nécessite un build préalable |
| `npm run db:seed` | Recharge le jeu de données de démonstration |
| `npx prisma studio` | Interface d'administration de la base de données |
| `npx prisma migrate dev --name <nom>` | Crée et applique une nouvelle migration |

## Compte de démonstration

Le script `npm run db:seed` crée une tontine rotative de démonstration ("[DÉMO] Tontine des
Collègues") avec 10 membres fictifs, démarrée il y a 6 mois, incluant des cotisations payées,
partielles, en retard et en attente de vérification — conformément à la section 19 du cahier
des charges. **Aucune donnée personnelle réelle n'est utilisée.**

- Téléphone (responsable) : `+225070000010`
- Mot de passe (tous les comptes de démo) : `Demo1234!`

Pour réinitialiser proprement l'environnement de démonstration, relancez simplement
`npm run db:seed` : le script supprime d'abord toutes les données marquées `isDemo=true`
avant de les recréer. Ces données sont clairement identifiées en base (`isDemo: true` sur
`User` et `Tontine`) et dans l'interface (badge "Données de démonstration").

## Tests

```bash
npm run test       # 34 tests unitaires et d'intégration (Vitest), contre la base réelle
npm run build       # requis avant les tests e2e (next start sert le build)
npm run test:e2e    # parcours utilisateur complet dans un vrai navigateur (Playwright)
```

Couverture actuelle :

- **Unitaires** : calcul du calendrier des tours (`buildRotativeCyclePlan`), génération des
  codes d'invitation, formatage des montants XOF, export CSV.
- **Intégration (base réelle)** : recalcul du statut d'une cotisation (à payer → partiel →
  confirmé) à partir des paiements `CONFIRMED` uniquement, contrôle des rôles
  (`requireMembership`), **isolation stricte entre deux tontines distinctes**, détection des
  paiements en double par référence de transaction, idempotence des événements webhook de
  paiement (contrainte d'unicité `providerCode` + `externalEventId`).
- **End-to-end** : inscription → création de compte → connexion automatique → création d'une
  tontine → refus de démarrage avec un seul membre → déconnexion/reconnexion.

Tous les tests sont exécutés contre une vraie base PostgreSQL (pas de mock de la couche
données) : le `DATABASE_URL` des tests pointe par défaut sur la même base que le
développement (voir `tests/setup.ts`) — utilisez une base dédiée en CI.

## Fonctionnalités terminées

- Inscription / connexion par téléphone + mot de passe, sessions sécurisées (JWT, cookies
  `httpOnly`), désactivation de compte, modification du profil, changement de mot de passe.
- Création d'une tontine rotative, gestion des membres, invitations par lien à code unique
  (expiration 7 jours), ordre des bénéficiaires modifiable par glisser (flèches) avant
  démarrage, retrait d'un membre avec motif traçable.
- Démarrage d'une tontine : génération automatique du calendrier des tours, de l'ordre des
  bénéficiaires, des cotisations attendues et du règlement (figé, versionné).
- Cotisations : déclaration par le membre, enregistrement manuel par le responsable/trésorier,
  paiements partiels, confirmation/rejet avec motif, détection de doublon par référence de
  transaction, distinction stricte déclaré / en attente / confirmé.
- Versements aux bénéficiaires : suivi par tour, confirmation manuelle avec méthode et
  référence.
- Tableau de bord multi-tontines avec montants attendus/confirmés/en attente clairement
  distincts (jamais de somme attendue présentée comme disponible), échéances à venir, retards.
- Rapports : par membre, par retard, export CSV complet (cotisations + paiements).
- Règlement de la tontine (montant, fréquence, ordre, retards, contestation, validation),
  acceptation individuelle tracée avec horodatage.
- Notifications dans l'application (paiement confirmé/rejeté, versement confirmé), page de
  notifications avec marquage lu/non lu.
- Contrôle d'accès basé sur les rôles (Responsable, Trésorier, Secrétaire, Membre), **vérifié
  côté serveur sur chaque action**, isolation stricte des données entre tontines.
- Journal d'audit (`AuditLog`) sur toutes les opérations sensibles (création, démarrage,
  invitation, paiement, rejet, versement, retrait de membre...).
- Jeu de données de démonstration clairement identifié, compte de démo documenté et
  réinitialisable.
- **Mobile Money (mode démonstration)** : interface commune aux 4 prestataires (Orange Money,
  MTN MoMo, Moov Money, Wave), initiation d'un paiement, traitement idempotent des
  confirmations/échecs/remboursements via un point d'entrée webhook partagé
  (`src/lib/payments/webhook-processor.ts`), et — en l'absence de clés API réelles — bascule
  automatique en mode démonstration clairement étiqueté dans l'interface (badge "DÉMO",
  boutons "[DÉMO] Simuler succès/échec"), sans jamais transférer d'argent réel. Voir
  [Intégrations externes](#intégrations-externes).

## Fonctionnalités restant à configurer

Ces éléments ont leur **modèle de données prêt** (schéma Prisma) mais nécessitent du
développement d'interface ou une intégration externe avant mise en production :

- **Autres types de tontines** : épargne collective, cotisations variables, tontine
  solidaire (campagnes). Le schéma (`Tontine.type`, `goalAmountXof`, montants min/recommandé)
  les anticipe ; seule l'interface de création/suivi spécifique à chaque type reste à écrire.
- **Module caisse et prêts internes** (`Loan`, `LoanRepayment`, `CashTransaction`) : modèle de
  données prêt, pas encore d'interface. Les intérêts (`interestRateBp`) restent à 0 par défaut
  et ne doivent être activés qu'après validation des obligations légales applicables.
- **Intégrations Mobile Money réelles** (Orange Money, MTN MoMo, Moov Money, Wave) : le mode
  démonstration fonctionne de bout en bout (voir ci-dessus), mais aucun des 4 adaptateurs
  (`src/lib/payments/providers/`) n'appelle réellement l'API d'un prestataire — chacun lève une
  erreur explicite tant que ses identifiants ne sont pas configurés, puis tant que l'appel réel
  n'est pas implémenté. **Aucune clé d'API, numéro marchand ou réponse de prestataire n'a été
  inventée.** Voir [Intégrations externes](#intégrations-externes) pour les étapes d'activation
  exactes.
- **SMS, e-mail transactionnel, WhatsApp Business** : aucun fournisseur n'est connecté. Les
  notifications dans l'application fonctionnent déjà ; l'envoi externe nécessite la
  configuration d'un prestataire (voir ci-dessous) et n'est jamais simulé comme réussi.
- **Vérification du numéro de téléphone par SMS** à l'inscription (nécessite un fournisseur).
- **Export PDF** des rapports (le CSV est disponible dès maintenant).
- **Tirage au sort documenté** de l'ordre des bénéficiaires (actuellement : ordre manuel
  uniquement). Le champ `assignedMethod` du modèle `BeneficiaryOrder` anticipe déjà `RANDOM_DRAW`.
- **Reconduction automatique** d'une tontine rotative après son tour complet (actuellement :
  un seul cycle complet par tontine).
- **Internationalisation** : seul le français est implémenté ; l'architecture (locale sur
  `User`, textes centralisés) permet d'ajouter d'autres langues sans refonte.
- **Interface d'administration de la plateforme** (suspension de compte avec procédure,
  consultation des journaux techniques) : le champ `User.platformRole` et les colonnes de
  suspension existent en base, mais aucune interface n'y est encore branchée.

## Architecture et modèle de données

Schéma complet dans [`prisma/schema.prisma`](./prisma/schema.prisma), commenté en français.
Points clés :

- **Tous les montants sont des entiers** en francs CFA (XOF) — jamais de nombre flottant.
- **Isolation stricte entre tontines** : chaque requête de données passe par
  `requireMembership(tontineId, rôles?)` (`src/lib/rbac.ts`), qui vérifie une
  `TontineMembership` active avant tout accès. Cette vérification est systématiquement
  dérivée de la ressource réelle en base (jamais d'un identifiant de tontine fourni "à
  l'aveugle" par le client).
- **Distinction stricte des statuts financiers** : `Contribution.amountExpectedXof` (attendu)
  ≠ `Contribution.amountConfirmedXof` (confirmé, recalculé uniquement à partir des `Payment`
  au statut `CONFIRMED` — voir `recomputeContribution` dans `src/lib/tontine-engine.ts`) ≠
  `Payout` (versé au bénéficiaire). Un paiement "déclaré" par un membre n'est jamais traité
  comme une confirmation de réception de fonds.
- **Aucune suppression silencieuse** des opérations financières confirmées : toute correction
  passe par un paiement de rectification lié (`Payment.correctsPaymentId`) et un journal
  d'audit (`AuditLog`).
- **Suppressions logiques** : `User.deletedAt` (désactivation de compte).
- **Migrations versionnées** dans `prisma/migrations/`.

## Sécurité

- Mots de passe hachés avec bcrypt (12 rounds), jamais stockés ni journalisés en clair.
- Autorisation vérifiée **côté serveur** sur chaque Server Action et chaque route API — voir
  `src/lib/rbac.ts`. Aucune donnée d'autorisation (rôle, montant, statut) n'est jamais
  acceptée telle que fournie par le client sans revérification en base.
- Secrets exclusivement via variables d'environnement (`.env`, jamais committé — voir
  `.gitignore`).
- Codes d'invitation à entropie cryptographique (`node:crypto.randomInt`), expiration
  obligatoire (7 jours).
- Idempotence des webhooks de paiement prévue au niveau base (contrainte unique
  `PaymentWebhookEvent[providerCode, externalEventId]`), testée (voir
  `tests/integration/webhook-idempotency.test.ts`).
- Détection des paiements en double par référence de transaction au sein d'une même tontine.
- Journal d'audit sur les actions sensibles (`AuditLog`).

**À faire avant une mise en production réelle** (non couvert par ce MVP) : limitation du
débit de connexion (rate limiting) sur `/connexion` et `/inscription`, politique de rotation
des secrets, sauvegardes automatisées et testées de PostgreSQL, audit de sécurité
indépendant, invalidation de session active à la désactivation d'un compte (actuellement, un
jeton JWT déjà émis reste valide jusqu'à son expiration naturelle même après désactivation du
compte — limitation connue, voir ci-dessous).

## Intégrations externes

Aucune de ces intégrations n'est active par défaut. **Aucune clé, numéro marchand ou réponse
de prestataire n'a été inventée.** Tant qu'un fournisseur n'est pas configuré, l'application
ne prétend jamais qu'un SMS, un e-mail, un message WhatsApp a été envoyé, ni qu'un paiement
Mobile Money a été effectué.

### Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave)

**Ce qui fonctionne déjà, sans aucune configuration** : sur la page Cotisations, tout membre
peut cliquer "Payer via Mobile Money", choisir un prestataire et un montant. Comme aucun
prestataire n'est configuré, l'application bascule automatiquement en **mode démonstration**
(`src/lib/payments/service.ts`) : une référence de transaction locale est générée, le paiement
est créé au statut `DECLARED`, et l'interface affiche un badge "DÉMO" avec deux boutons
"[DÉMO] Simuler succès" / "[DÉMO] Simuler échec". Cliquer sur ces boutons appelle
`simulateMobileMoneyCallbackAction`, qui passe par **exactement la même fonction** de
traitement qu'un vrai webhook (`processProviderWebhook`) : idempotence, recalcul de la
cotisation, notification, journal d'audit. Rien n'est "confirmé en douce" : même en démo, le
paiement reste `DECLARED` jusqu'au clic explicite simulant la réponse du prestataire. Aucun
argent ne change de main à aucun moment de ce flux.

**Architecture** (`src/lib/payments/`) :

- `types.ts` : interface commune `MobileMoneyAdapter` (une implémentation par prestataire).
- `providers/{orange-money,mtn-momo,moov-money,wave}.ts` : un adaptateur par prestataire.
  Chacun vérifie ses variables d'environnement requises et refuse de s'exécuter si elles
  manquent (`ProviderNotConfiguredError`) ; l'appel API réel est un `TODO` explicite, car la
  documentation officielle de chaque prestataire n'a pas été consultée pour ce projet.
- `service.ts` (`initiateMobileMoneyPayment`) : point d'entrée unique. Appelle l'adaptateur réel
  si le prestataire est configuré, sinon bascule en démonstration.
- `webhook-processor.ts` (`processProviderWebhook`) : traitement idempotent partagé entre les
  vrais webhooks et la simulation démo (idempotence testée dans
  `tests/integration/mobile-money-webhook.test.ts` : succès, échec, doublon, signature
  invalide, remboursement, paiement déjà finalisé).
- `verify-signature.ts` : vérification HMAC-SHA256 **générique**, fail-safe (signature
  considérée invalide si `PAYMENT_WEBHOOK_SIGNING_SECRET` est absent). **À remplacer par le
  schéma de signature réel de chaque prestataire avant mise en production.**
- Route webhook générique : `src/app/api/webhooks/mobile-money/[provider]/route.ts`.

**Pour activer une intégration réelle avec un prestataire** :

1. Obtenir un compte marchand et des identifiants API auprès du prestataire (voir les
   commentaires en tête de chaque fichier dans `src/lib/payments/providers/` pour le détail
   exact par prestataire).
2. Renseigner les variables correspondantes dans `.env` (voir `.env.example` — ex:
   `ORANGE_MONEY_API_KEY`, `ORANGE_MONEY_MERCHANT_ID`).
3. Implémenter l'appel réel dans `initiatePayment()` de l'adaptateur correspondant, en suivant
   la documentation officielle du prestataire (jamais reproduite ici).
4. Remplacer la vérification de signature générique par le schéma réel du prestataire dans la
   route webhook, avant tout traitement.
5. Ne jamais marquer un paiement `CONFIRMED` sans confirmation vérifiable du prestataire —
   c'est déjà garanti par `processProviderWebhook`, à condition de ne pas contourner ce chemin.

### SMS / e-mail / WhatsApp

Les notifications dans l'application (`Notification`, canal `IN_APP`) fonctionnent sans
aucune configuration. Pour les canaux externes, renseignez les variables correspondantes dans
`.env` et implémentez l'envoi dans un module dédié (ex: `src/lib/notifications/sms.ts`) ; en
leur absence, `Notification.deliveryError` documente que le canal n'est pas opérationnel.

## Déploiement

1. Provisionner une base PostgreSQL accessible depuis l'environnement de déploiement.
2. Définir les variables d'environnement de production (`DATABASE_URL`, `AUTH_SECRET` fort et
   unique, `NEXT_PUBLIC_APP_NAME`).
3. `npx prisma migrate deploy` (jamais `migrate dev` en production).
4. `npm run build` puis `npm run start`, derrière un reverse proxy TLS (HTTPS obligatoire :
   les cookies de session sont marqués `Secure` dès que la requête arrive en HTTPS).
5. Documenter et tester une procédure de sauvegarde régulière de PostgreSQL (`pg_dump`) avant
   toute mise en production réelle.

Toute plateforme supportant Next.js (Node.js ≥ 20.9) et PostgreSQL convient (Vercel + base
managée, conteneur Docker derrière un reverse proxy, VPS avec PostgreSQL local, etc.).

## Limites connues et risques de production

- **Un seul cycle complet** par tontine rotative : pas de reconduction automatique après le
  dernier tour (limitation documentée, décision volontaire pour la robustesse du MVP).
- **Entrée/sortie de membre en cours de tontine active** : un membre peut être retiré
  (`status: LEFT`), mais la redistribution des cotisations déjà planifiées sur le reste du
  cycle n'est pas automatisée — à traiter manuellement par le responsable en l'état actuel.
- **Invalidation de session à la désactivation d'un compte** : non implémentée (le jeton JWT
  existant reste valide jusqu'à expiration). À corriger avant toute mise en production avec
  des enjeux de sécurité forts (ex: liste de révocation de session).
- **Aucun rate limiting** sur les tentatives de connexion : à ajouter avant mise en
  production (ex: limitation par IP/numéro sur `/connexion`).
- **Pas de vérification SMS du numéro de téléphone** à l'inscription : un numéro peut être
  saisi sans preuve de possession tant qu'aucun fournisseur SMS n'est connecté.
- **Mobile Money non opérationnel** : toute mention de paiement par Mobile Money dans
  l'interface actuelle correspond à un enregistrement **manuel** (déclaré par un humain), pas
  à une transaction réellement vérifiée par un prestataire.

## Conformité

Ce logiciel est un **outil de gestion et de traçabilité** : il ne détient, ne collecte, ne
transfère et ne conserve à aucun moment l'argent des utilisateurs. Les cotisations et
versements sont enregistrés comme faits déclarés ou constatés par les membres eux-mêmes
(espèces, virement bancaire, ou Mobile Money effectué hors de l'application et simplement
rapporté/vérifié manuellement dans l'outil).

**Avant toute exploitation commerciale réelle en Côte d'Ivoire ou dans la diaspora**, faites
vérifier par un professionnel qualifié :

- les obligations applicables en matière de services de paiement (BCEAO et régulateurs
  locaux) ;
- les exigences de protection des données personnelles (Côte d'Ivoire, RGPD pour les
  utilisateurs européens) ;
- les obligations de lutte contre le blanchiment et de connaissance client (si le périmètre
  évolue vers la détention de fonds) ;
- les règles applicables aux prêts et aux intérêts si le module caisse/prêts est activé avec
  des intérêts ;
- les conditions contractuelles des prestataires de paiement envisagés.

Ce README ne constitue pas un avis juridique et l'application n'est **pas** présentée comme
juridiquement conforme sans cette vérification.
