import { prisma } from "../common/prisma";
import { notify } from "../modules/notifications/notifications.service";

/**
 * Marque en retard les cotisations dont le délai de grâce est dépassé et calcule la pénalité
 * (cf. PRD règle n°3). En environnement réel ce serait un worker planifié (BullMQ) — ici un simple
 * intervalle en mémoire, suffisant pour une démo mono-instance.
 */
export async function markLateContributions() {
  const dueContributions = await prisma.contribution.findMany({
    where: { status: "due" },
    include: { round: { include: { tontine: true } }, membership: true },
  });
  const now = Date.now();
  for (const c of dueContributions) {
    const graceMs = c.round.tontine.gracePeriodHours * 60 * 60 * 1000;
    if (c.round.dueDate.getTime() + graceMs >= now) continue;

    const rule = c.round.tontine.penaltyRule as { type?: string; value?: number };
    const penalty =
      rule?.type === "percent"
        ? (c.amountDue * BigInt(Math.round((rule.value ?? 0) * 100))) / 10000n
        : BigInt(Math.round(rule?.value ?? 0));

    await prisma.contribution.update({ where: { id: c.id }, data: { status: "late", penaltyAmount: penalty } });
    await notify(
      c.membership.userId,
      "late",
      "Cotisation en retard",
      `Votre cotisation du tour ${c.round.roundNumber} est en retard. Pénalité : ${penalty} FCFA.`,
      { contributionId: c.id },
    );
  }
}

/** Rappels J-2/J-1 avant l'échéance (cf. parcours P4). */
export async function sendDueReminders() {
  const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const dueContributions = await prisma.contribution.findMany({
    where: { status: "due", round: { dueDate: { lte: soon } } },
    include: { round: true, membership: true },
  });
  for (const c of dueContributions) {
    await notify(
      c.membership.userId,
      "payment_reminder",
      "Rappel de cotisation",
      `Pensez à cotiser avant le ${c.round.dueDate.toLocaleDateString("fr-FR")}.`,
      { contributionId: c.id },
    );
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  if (interval) return;
  interval = setInterval(() => {
    markLateContributions().catch((err) => console.error("[scheduler] markLateContributions", err));
  }, 30_000);
  // Rappels moins fréquents pour ne pas spammer les notifications en démo.
  setInterval(() => {
    sendDueReminders().catch((err) => console.error("[scheduler] sendDueReminders", err));
  }, 5 * 60_000);
}
