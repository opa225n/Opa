import "./common/bigint-json";
import express from "express";
import cors from "cors";
import { ApiError } from "./common/errors";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { tontinesRouter, invitationsRouter } from "./modules/tontines/tontines.routes";
import { tontineRoundsRouter, roundsRouter } from "./modules/rounds/rounds.routes";
import { payoutRouter } from "./modules/rounds/payout.routes";
import { historyRouter } from "./modules/tontines/history.routes";
import { contributionsRouter, paymentsRouter } from "./modules/contributions/contributions.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { wireSimulatedWebhooks } from "./modules/payments/payments.service";

export function createApp() {
  wireSimulatedWebhooks();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/v1/health", (_req, res) => res.json({ ok: true }));

  app.use("/v1/auth", authRouter);
  app.use("/v1/me", usersRouter);
  app.use("/v1/tontines", tontinesRouter);
  app.use("/v1/tontines/:id/rounds", tontineRoundsRouter);
  app.use("/v1/tontines/:id/history", historyRouter);
  app.use("/v1/invitations", invitationsRouter);
  app.use("/v1/rounds", roundsRouter);
  app.use("/v1/payouts", payoutRouter);
  app.use("/v1/contributions", contributionsRouter);
  app.use("/v1/payments", paymentsRouter);
  app.use("/v1/notifications", notificationsRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
    }
    console.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Erreur interne." });
  });

  return app;
}
