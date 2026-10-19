/**
 * Script à usage unique : supprime les données de démo (isDemo=true) sans les recréer.
 * Destiné à être retiré du script "build" après son premier passage en production — voir
 * la demande de nettoyage avant lancement public.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tontines = await prisma.tontine.deleteMany({ where: { isDemo: true } });
  const users = await prisma.user.deleteMany({ where: { isDemo: true } });
  console.log(`Nettoyage démo : ${tontines.count} tontine(s), ${users.count} utilisateur(s) supprimés.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
