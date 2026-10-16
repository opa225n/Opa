# Agence d'automatisation WhatsApp/IA

Un chatbot WhatsApp/IA pour les PME ivoiriennes (commerces de proximité) :
il répond aux questions, prend les commandes et transfère vers un humain
quand il ne sait pas — à partir d'une fiche d'informations validée par
chaque commerce, jamais en inventant.

Construit à partir du dossier de cadrage (PRD, TRD, App Flow, Schéma
backend, Plan d'implémentation, UI/UX) de l'agence. Voir ces documents pour
le détail des décisions produit ; ce dossier contient le code.

## Ce que contient ce dossier

```
whatsapp-agence/
├── docker-compose.yml       # n8n + PostgreSQL
├── .env.example             # toutes les variables/secrets à renseigner
├── db/
│   ├── migrations/          # schéma SQL complet (types, tables, RLS, fonctions métier)
│   └── seed/                # commerce de démonstration
├── n8n/workflows/           # les 3 workflows à importer dans n8n
│   ├── 01-reception-whatsapp.json   # le cœur : webhook, machine à états, IA, garde-fous
│   ├── 02-taches-planifiees.json    # reprise auto, purge, plafond, rapport mensuel
│   └── 03-api-interne.json          # fiche, statut commande, reprise manuelle, suppression contact
├── prompts/
│   ├── system-prompt.md     # garde-fous de l'IA (ne jamais inventer un prix/une info)
│   └── fiche-template.md    # gabarit à remplir avec chaque commerce
├── site/
│   ├── index.html           # site vitrine public de l'agence
│   └── demo/                # 3 écrans de démonstration (vente, pas connectés à la base)
└── docs/
    ├── DEPLOIEMENT.md       # de zéro à un premier message qui répond
    ├── TESTS.md             # jeu de tests avant de passer un client en production
    └── EXPLOITATION.md      # ce qui tourne en continu, procédures courantes
```

## Démarrage rapide

1. Lisez **`docs/DEPLOIEMENT.md`** du début à la fin — il couvre les comptes
   Meta/Anthropic à créer, le serveur, et l'import dans n8n.
2. Le site vitrine (`site/index.html`) est déployable immédiatement, sans
   backend, sur GitHub Pages/Netlify/Cloudflare Pages — changez le nom de
   l'agence (`window.AGENCE_NOM` en haut de `index.html`) et les
   coordonnées (`[E-MAIL]`, `[NUMÉRO WHATSAPP]`).
3. Le chatbot lui-même (n8n + PostgreSQL + API Claude) a besoin de vrais
   accès WhatsApp Business/Meta et d'un serveur — rien ne peut « tourner »
   sans ces comptes, voir `docs/DEPLOIEMENT.md` phase 0.

## État de ce qui est livré ici vs. ce qui reste à faire par vous

**Déjà construit (code complet, prêt à déployer) :**
- schéma PostgreSQL complet avec isolation par ligne entre commerces (RLS) ;
- les 3 workflows n8n : réception/réponse WhatsApp avec machine à états,
  garde-fous IA (jamais de prix inventé, détection d'injection de consigne),
  tâches planifiées (reprise automatique, purge, alertes, rapport mensuel),
  et une petite API interne (fiche, commandes, reprise manuelle) ;
- le site vitrine de l'agence et 3 écrans de démonstration commerciale.

**À faire par vous, car cela demande vos propres comptes/décisions**
(voir aussi les « questions ouvertes » de chaque document du dossier) :
- créer le compte Meta Business, l'app WhatsApp et obtenir un numéro ;
- choisir et payer un serveur (VPS) et un nom de domaine ;
- renseigner `.env` avec vos vraies clés (rien n'est pré-rempli, par
  sécurité) ;
- importer les workflows dans votre instance n8n et relier les credentials ;
- choisir votre premier commerce pilote, rédiger sa fiche avec lui, et
  dérouler le jeu de tests (`docs/TESTS.md`) avant toute mise en ligne réelle ;
- trancher les « questions ouvertes » métier du PRD (nom de l'agence, statut
  juridique, prix définitifs) — ce code fonctionne avec n'importe quelle
  réponse à ces questions.

## Sécurité — à ne jamais faire

- Ne committez jamais le fichier `.env` (il est dans la liste des choses à
  garder hors de Git) ni aucune clé en dur dans un workflow ou un document.
- Ne rendez jamais l'interface d'administration n8n accessible sans mot de
  passe fort (`N8N_BASIC_AUTH_*` dans `.env`).
