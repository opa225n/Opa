/**
 * Jeu de données de démonstration — à exécuter avec `npm run db:seed`.
 *
 * Toutes les entités créées ici sont marquées isDemo=true et utilisent des numéros de
 * téléphone fictifs (plage +225 07 00 00 0x réservée aux tests). Aucune donnée personnelle
 * réelle n'est utilisée. Le script est idempotent : il supprime d'abord les anciennes
 * données de démonstration avant de les recréer.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Réimplémentation locale de buildRotativeCyclePlan (src/lib/tontine-engine.ts) : ce fichier
// de seed s'exécute via `tsx`, hors du bundler Next.js, qui ne peut pas résoudre l'import
// "server-only" présent dans tontine-engine.ts (garde-fou volontaire de ce module serveur).
interface CyclePlanItem {
  periodIndex: number;
  periodStart: Date;
  periodDue: Date;
  beneficiaryMembershipId: string;
}

function addMonthsUtc(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function buildRotativeCyclePlan(
  startDate: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY",
  orderedMembershipIds: string[]
): CyclePlanItem[] {
  const stepDays = frequency === "DAILY" ? 1 : frequency === "WEEKLY" ? 7 : null;
  const dueDate = (periodIndex: number) =>
    stepDays
      ? new Date(startDate.getTime() + (periodIndex - 1) * stepDays * 24 * 60 * 60 * 1000)
      : addMonthsUtc(startDate, periodIndex - 1);

  return orderedMembershipIds.map((membershipId, index) => {
    const periodIndex = index + 1;
    return {
      periodIndex,
      periodStart: index === 0 ? startDate : dueDate(periodIndex - 1),
      periodDue: dueDate(periodIndex),
      beneficiaryMembershipId: membershipId,
    };
  });
}

const DEMO_PASSWORD = "Demo1234!";

const DEMO_MEMBERS = [
  "Aïcha Koné",
  "Boubacar Diabaté",
  "Chantal Yao",
  "David N'Guessan",
  "Estelle Kouamé",
  "Fousseni Traoré",
  "Grace Adjoua",
  "Hamed Ouattara",
  "Inès Dago",
  "Jean-Marc Bamba",
];

async function main() {
  console.log("Suppression des anciennes données de démonstration...");
  await prisma.tontine.deleteMany({ where: { isDemo: true } });
  await prisma.user.deleteMany({ where: { isDemo: true } });

  console.log("Création des comptes de démonstration...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = await Promise.all(
    DEMO_MEMBERS.map((fullName, index) =>
      prisma.user.create({
        data: {
          fullName,
          phone: `+2250700000${String(index + 10).padStart(2, "0")}`,
          passwordHash,
          countryCode: "CI",
          isDemo: true,
          termsAcceptedAt: new Date(),
          profile: { create: {} },
        },
      })
    )
  );

  const responsable = users[0];

  console.log("Création de la tontine de démonstration...");
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // démarrée il y a 6 mois pour avoir de l'historique

  const tontine = await prisma.tontine.create({
    data: {
      name: "[DÉMO] Tontine des Collègues",
      description: "Jeu de données de démonstration — 10 membres, 10 000 FCFA/mois.",
      type: "ROTATIVE",
      status: "ACTIVE",
      contributionAmountXof: 10000,
      frequency: "MONTHLY",
      startDate,
      isDemo: true,
      createdById: responsable.id,
    },
  });

  const memberships = await Promise.all(
    users.map((u, index) =>
      prisma.tontineMembership.create({
        data: {
          tontineId: tontine.id,
          userId: u.id,
          role: index === 0 ? "RESPONSABLE" : index === 1 ? "TRESORIER" : "MEMBRE",
          status: "ACTIVE",
          displayOrder: index,
        },
      })
    )
  );

  const plan = buildRotativeCyclePlan(
    startDate,
    "MONTHLY",
    memberships.map((m) => m.id)
  );
  const amountExpected = 10000;
  const payoutAmount = amountExpected * memberships.length;

  await prisma.tontineRules.create({
    data: {
      tontineId: tontine.id,
      version: 1,
      status: "ACTIVE",
      content: {
        montant: amountExpected,
        frais: 0,
        frequence: "MONTHLY",
        nombreDeTours: plan.length,
        ordreDesBeneficiaires: memberships.map((m) => m.id),
        dateDemarrage: startDate,
        reglesDeRetard: "Un membre en retard reste dû tant que le paiement n'est pas confirmé.",
        conditionsEntreeSortie: "Un membre ne peut quitter la tontine qu'avec l'accord du responsable.",
        procedureContestation: "Toute contestation est à signaler via la page Opérations de la tontine.",
        reglesValidation: "Les paiements et versements sont confirmés par le responsable ou le trésorier.",
      },
    },
  });

  const now = new Date();

  for (const item of plan) {
    const isPast = item.periodDue < now;
    const cycle = await prisma.tontineCycle.create({
      data: {
        tontineId: tontine.id,
        periodIndex: item.periodIndex,
        periodStart: item.periodStart,
        periodDue: item.periodDue,
        status: isPast
          ? "COMPLETED"
          : item.periodIndex === plan.findIndex((p) => p.periodDue >= now) + 1
            ? "ACTIVE"
            : "PENDING",
      },
    });

    await prisma.beneficiaryOrder.create({
      data: {
        tontineId: tontine.id,
        cycleId: cycle.id,
        membershipId: item.beneficiaryMembershipId,
        assignedMethod: "MANUAL",
        confirmedAt: startDate,
      },
    });

    await prisma.payout.create({
      data: {
        tontineId: tontine.id,
        cycleId: cycle.id,
        membershipId: item.beneficiaryMembershipId,
        amountXof: payoutAmount,
        status: isPast ? "CONFIRMED" : "PENDING",
        method: isPast ? "MOBILE_MONEY" : undefined,
        confirmedAt: isPast ? item.periodDue : undefined,
        recordedById: responsable.id,
      },
    });

    // Scénario varié pour les tours passés : la plupart payés, un retard, un en attente de vérification.
    for (let i = 0; i < memberships.length; i++) {
      const membership = memberships[i];
      let status: "DUE" | "PARTIAL" | "DECLARED" | "CONFIRMED" = "DUE";
      let confirmed = 0;

      if (isPast) {
        if (i === 3 && item.periodIndex === plan.length) {
          // Membre en retard sur le tour le plus récent déjà passé.
          status = "DUE";
          confirmed = 0;
        } else if (i === 7 && item.periodIndex === plan.length) {
          status = "PARTIAL";
          confirmed = 4000;
        } else {
          status = "CONFIRMED";
          confirmed = amountExpected;
        }
      }

      const contribution = await prisma.contribution.create({
        data: {
          tontineId: tontine.id,
          cycleId: cycle.id,
          membershipId: membership.id,
          amountExpectedXof: amountExpected,
          amountConfirmedXof: confirmed,
          status,
        },
      });

      if (confirmed > 0) {
        await prisma.payment.create({
          data: {
            contributionId: contribution.id,
            amountXof: confirmed,
            method: i % 2 === 0 ? "MOBILE_MONEY" : "CASH",
            status: "CONFIRMED",
            paidAt: item.periodDue,
            recordedById: responsable.id,
            validatedById: responsable.id,
            validatedAt: item.periodDue,
          },
        });
      }
    }
  }

  // Un paiement déclaré par un membre, pas encore vérifié par le trésorier (tour actif).
  const activeCycle = await prisma.tontineCycle.findFirst({
    where: { tontineId: tontine.id, status: "ACTIVE" },
  });
  if (activeCycle) {
    const contribution = await prisma.contribution.findFirst({
      where: { cycleId: activeCycle.id, membershipId: memberships[2].id },
    });
    if (contribution) {
      await prisma.payment.create({
        data: {
          contributionId: contribution.id,
          amountXof: amountExpected,
          method: "MOBILE_MONEY",
          status: "DECLARED",
          isManualEntry: true,
          paidAt: new Date(),
          transactionRef: "DEMO-MM-0001",
          recordedById: memberships[2].userId,
        },
      });
      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "DECLARED" } });
    }
  }

  const rules = await prisma.tontineRules.findFirstOrThrow({ where: { tontineId: tontine.id } });
  for (const m of memberships) {
    await prisma.rulesAcceptance.upsert({
      where: { rulesId_userId: { rulesId: rules.id, userId: m.userId } },
      create: { rulesId: rules.id, userId: m.userId, membershipId: m.id },
      update: {},
    });
  }

  console.log("\nDonnées de démonstration créées avec succès.");
  console.log("Compte de démonstration (responsable) :");
  console.log(`  Téléphone : ${responsable.phone}`);
  console.log(`  Mot de passe : ${DEMO_PASSWORD}`);
  console.log(`\nTous les comptes membres utilisent le même mot de passe : ${DEMO_PASSWORD}`);
  users.forEach((u) => console.log(`  - ${u.fullName} : ${u.phone}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
