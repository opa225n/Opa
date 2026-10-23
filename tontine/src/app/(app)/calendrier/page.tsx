import { addMonths, subMonths } from "date-fns";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CalendarView, type CalendarEntry } from "./calendar-view";

export default async function GlobalCalendarPage() {
  const user = await requireUser();

  const memberships = await prisma.tontineMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true },
  });
  const membershipIds = memberships.map((m) => m.id);

  const now = new Date();
  const contributions = await prisma.contribution.findMany({
    where: {
      membershipId: { in: membershipIds },
      cycle: { periodDue: { gte: subMonths(now, 2), lte: addMonths(now, 6) } },
    },
    include: { tontine: true, cycle: true },
    orderBy: { cycle: { periodDue: "asc" } },
  });

  const entries: CalendarEntry[] = contributions.map((c) => {
    const totalDue = c.amountExpectedXof + c.penaltyXof;
    const remaining = Math.max(totalDue - c.amountConfirmedXof, 0);
    const isPaid = remaining === 0;
    return {
      id: c.id,
      tontineId: c.tontineId,
      tontineName: c.tontine.name,
      periodIndex: c.cycle.periodIndex,
      dateISO: c.cycle.periodDue.toISOString().slice(0, 10),
      amountDueXof: isPaid ? totalDue : remaining,
      isPaid,
      isLate: !isPaid && c.cycle.periodDue < now,
    };
  });

  return <CalendarView entries={entries} />;
}
