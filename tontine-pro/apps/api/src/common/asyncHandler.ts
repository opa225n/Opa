import type { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response) => Promise<unknown>;

// Évite de répéter try/catch dans chaque route : toute erreur part vers le middleware d'erreurs.
export function h(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
