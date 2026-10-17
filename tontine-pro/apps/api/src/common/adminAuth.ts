import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { Errors } from "./errors";

// Secret distinct de celui des jetons membres : un jeton membre ne doit jamais pouvoir
// authentifier une requête admin, et inversement (cf. TRD §sécurité : back-office renforcé).
const ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || "dev-admin-secret-change-me";

export interface AdminTokenPayload {
  sub: string; // adminUserId
  role: string;
}

export function signAdminToken(adminId: string, role: string): string {
  return jwt.sign({ sub: adminId, role }, ADMIN_SECRET, { expiresIn: "8h" });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string;
      adminRole?: string;
    }
  }
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw Errors.unauthorized();
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, ADMIN_SECRET) as AdminTokenPayload;
    req.adminId = payload.sub;
    req.adminRole = payload.role;
    next();
  } catch {
    throw Errors.unauthorized();
  }
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.adminRole !== "super_admin") throw Errors.forbidden("Action réservée à un super-administrateur.");
  next();
}
