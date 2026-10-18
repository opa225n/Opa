import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { Errors } from "./errors";
import { prisma } from "./prisma";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

export interface AccessTokenPayload {
  sub: string; // userId
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as AccessTokenPayload;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // Middleware async : toute erreur DOIT passer par next(err), jamais par un throw direct —
  // Express 4 ne rattrape pas les rejets de promesse d'un middleware async (process qui plante).
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw Errors.unauthorized();
    const token = header.slice("Bearer ".length);
    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      throw Errors.unauthorized();
    }
    // Un compte suspendu par un administrateur (écran B02) perd l'accès immédiatement.
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { status: true } });
    if (!user || user.status === "suspended") throw Errors.forbidden("Ce compte a été suspendu.");
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
}
