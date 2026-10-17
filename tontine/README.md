# Tontine Manager

Application web (PWA, sans build) pour gérer une ou plusieurs tontines :

- membres et ordre de rotation (qui reçoit la cagnotte à chaque tour)
- suivi des cotisations tour par tour (case à cocher par membre)
- résumé des soldes (payé / dû / solde) par membre
- export CSV de l'historique complet
- installable sur mobile, fonctionne hors-ligne

## Lancer
```
cd tontine
python3 -m http.server 8081   # puis http://localhost:8081
```
Déployable tel quel sur GitHub Pages / Netlify / Cloudflare Pages.

## Stockage des données
Toutes les données (tontines, membres, paiements) sont stockées **uniquement sur l'appareil**, dans le `localStorage` du navigateur. Il n'y a ni compte ni serveur :

- avantage : confidentialité totale, fonctionne hors-ligne, gratuit
- limite : les données ne sont pas partagées entre appareils/participants, et vider les données du navigateur les efface. Pensez à exporter régulièrement en CSV (onglet Réglages d'une tontine) pour garder une sauvegarde.

## Installer sur mobile
Ouvrez l'URL dans le navigateur du téléphone, puis "Ajouter à l'écran d'accueil" (Chrome/Safari) pour l'utiliser comme une app.
