import { createHash } from "crypto";

// Hash simplifié pour la démo (sha256+sel statique). En production : bcrypt/argon2 (cf. TRD §sécurité).
const SALT = "tontine-dev-salt";

export function hashSecret(value: string): string {
  return createHash("sha256").update(`${SALT}:${value}`).digest("hex");
}

export function secretMatches(value: string, hash: string): boolean {
  return hashSecret(value) === hash;
}
