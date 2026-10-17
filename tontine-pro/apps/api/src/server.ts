import "dotenv/config";
import { createApp } from "./app";
import { startScheduler } from "./jobs/scheduler";

const port = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`[tontine-api] écoute sur http://localhost:${port}`);
  startScheduler();
});
