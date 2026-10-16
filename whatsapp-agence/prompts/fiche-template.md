# Gabarit de fiche commerce

La fiche est la SEULE source d'information de l'assistant (TRD section 6).
Elle est rédigée avec le patron pendant l'étape « Collecte des contenus »
(PRD section 9, étape 3), relue et validée par écrit par lui avant la mise en
ligne (critère de test TRD section 11).

Chaque nouvelle version est insérée dans la table `fiches` avec un numéro de
version incrémenté ; une seule fiche est `active = true` par commerce à la
fois (contrainte `fiches_une_active`, migration 003). Ne jamais modifier une
fiche existante : toujours insérer une nouvelle version, pour garder
l'historique (Plan d'implémentation, phase 3 : « toute correction passe par
une nouvelle version »).

## Gabarit à remplir avec le patron

```
Nom du commerce : [nom]
Horaires : [jours et heures d'ouverture, jours de fermeture]
Adresse : [quartier, ville]
Livraison : [zones couvertes, prix, délai]
Paiement : [moyens acceptés — espèces, Mobile Money — jamais de données de carte]

Produits et prix (un par ligne, prix exact en FCFA) :
- [produit 1] : [prix] FCFA
- [produit 2] : [prix] FCFA
...

Politique de retour / annulation : [règles exactes]

Questions fréquentes et réponses exactes (à partir des 20 vraies questions
collectées — PRD section 9, étape 3) :
- [question] → [réponse]
...

Ton souhaité : [ex. chaleureux, simple, phrases courtes, toujours proposer
un humain en cas de doute]

Sujets à toujours transférer à un humain (en plus des règles par défaut) :
- [ex. demandes de gros volumes, clients professionnels, réclamations]
```

## Insertion en base (via le workflow admin interne)

```sql
insert into fiches (commerce_id, version, contenu, validee_le, validee_par)
values ($1, $2, $3, now(), $4);

update fiches set active = false where commerce_id = $1 and id <> $5;
update fiches set active = true where id = $5;
```

(Le workflow `n8n/workflows/03-api-interne.json`, route « activer-fiche »,
encapsule ces deux étapes dans une seule transaction.)
