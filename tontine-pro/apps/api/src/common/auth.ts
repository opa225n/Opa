import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { Errors } from "./errors";

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

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw Errors.unauthorized();
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
    req.userId = payload.sub;
    next();
  } catch {
    throw Errors.unauthorized();
  }
}
