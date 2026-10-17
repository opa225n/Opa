import { createApp } from "../src/app";

// Point d'entrée serverless Vercel : une seule fonction gère toutes les requêtes
// (cf. vercel.json "rewrites"). Pas d'appel à startScheduler() ici — les tâches
// planifiées passent par Vercel Cron (/v1/internal/cron/*) plutôt que par un
// setInterval en mémoire, qui ne survivrait pas entre deux invocations serverless.
export default createApp();
