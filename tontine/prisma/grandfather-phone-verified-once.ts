/**
 * Script à usage unique : marque comme vérifiés les comptes déjà existants au moment de
 * l'introduction de la vérification SMS obligatoire, pour ne pas bloquer leur accès.
 * À retirer du script "build" après son premier passage en production.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { phoneVerified: false },
    data: { phoneVerified: true },
  });
  console.log(`Comptes existants marqués vérifiés : ${result.count}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
