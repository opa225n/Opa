# Kitsune VF

Application web (PWA, sans build) pour parcourir le catalogue d'animés (AniList) et regarder **vos propres sources** avec :

- lecture automatique, épisode suivant automatique (compte à rebours annulable), passage d'intro
- reprise automatique à l'ouverture de l'app, historique et progression
- HLS (`.m3u8`) et MP4, raccourcis clavier, Media Session, installable et hors-ligne (coquille)
- liens vers les plateformes officielles proposant la VF (Crunchyroll, ADN, Netflix, Prime, Disney+)

## Lancer
```
python3 -m http.server 8080   # puis http://localhost:8080
```
Déployable tel quel sur GitHub Pages / Netlify / Cloudflare Pages.

## Sources
Sur la fiche d'un animé, ajoutez une URL avec `{ep}` (ex. `https://mon-serveur/naruto/vf/{ep}.mp4`).
Seulement des contenus dont vous avez les droits (serveur perso, Jellyfin/Plex, domaine public). Le serveur doit autoriser le CORS pour les `.m3u8`.
