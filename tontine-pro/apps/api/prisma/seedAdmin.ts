// Provisionne le premier compte back-office. Pas de route d'inscription admin exposée publiquement
// (cf. TRD §sécurité) : un compte admin se crée hors-ligne, par ce script.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();
const SALT = "tontine-dev-salt";
const hashSecret = (value: string) => createHash("sha256").update(`${SALT}:${value}`).digest("hex");

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@tontine.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: hashSecret(password), fullName: "Administrateur", role: "super_admin" },
  });
  console.log(`Compte admin prêt : ${admin.email} / mot de passe : ${password} (changez-le en production)`);

  // Un 2e compte, nécessaire pour tester l'approbation à deux admins des corrections du grand livre.
  const email2 = "admin2@tontine.local";
  const admin2 = await prisma.adminUser.upsert({
    where: { email: email2 },
    update: {},
    create: { email: email2, passwordHash: hashSecret(password), fullName: "Administratrice 2", role: "admin" },
  });
  console.log(`2e compte admin prêt : ${admin2.email} / mot de passe : ${password}`);
}

main().finally(() => prisma.$disconnect());
