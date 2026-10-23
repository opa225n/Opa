"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatXof } from "@/lib/money";

export interface CalendarEntry {
  id: string;
  tontineId: string;
  tontineName: string;
  periodIndex: number;
  dateISO: string; // yyyy-MM-dd
  amountDueXof: number;
  isPaid: boolean;
  isLate: boolean;
}

const WEEKDAY_LETTERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function dayStatus(entries: CalendarEntry[]): "late" | "upcoming" | "paid" | null {
  if (entries.length === 0) return null;
  if (entries.some((e) => e.isLate)) return "late";
  if (entries.some((e) => !e.isPaid)) return "upcoming";
  return "paid";
}

const DOT_CLASS: Record<"late" | "upcoming" | "paid", string> = {
  late: "bg-red-500",
  upcoming: "bg-[var(--brand-gold)]",
  paid: "bg-emerald-500",
};

export function CalendarView({ entries }: { entries: CalendarEntry[] }) {
  const [tab, setTab] = useState<"month" | "list">("month");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      if (!map.has(e.dateISO)) map.set(e.dateISO, []);
      map.get(e.dateISO)!.push(e);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const upcoming = useMemo(
    () => entries.filter((e) => !e.isPaid).slice(0, 5),
    [entries]
  );

  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Calendrier</h1>
        <p className="text-sm text-stone-500">Vos cotisations, toutes tontines confondues.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "month" ? "default" : "outline"}
          onClick={() => setTab("month")}
        >
          Vue mensuelle
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "list" ? "default" : "outline"}
          onClick={() => setTab("list")}
        >
          Vue liste
        </Button>
      </div>

      {tab === "month" ? (
        <>
          <Card>
            <CardContent className="py-4">
              <div className="mb-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="font-display text-base font-semibold capitalize text-[var(--foreground)]">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
                {WEEKDAY_LETTERS.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dateISO = format(day, "yyyy-MM-dd");
                  const dayEntries = entriesByDate.get(dateISO) ?? [];
                  const status = dayStatus(dayEntries);
                  const inMonth = isSameMonth(day, currentMonth);
                  const selected = selectedDate === dateISO;
                  return (
                    <button
                      key={dateISO}
                      type="button"
                      onClick={() => setSelectedDate(selected ? null : dateISO)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg py-2 text-sm",
                        !inMonth && "text-stone-300",
                        inMonth && !selected && "text-stone-700 hover:bg-stone-50",
                        selected && "bg-[var(--brand)] text-white",
                        !selected && isToday(day) && "font-semibold text-[var(--brand)]"
                      )}
                    >
                      {Number(dateISO.slice(8, 10))}
                      {status && (
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            selected ? "bg-white" : DOT_CLASS[status]
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <p className="text-sm font-medium capitalize text-stone-500">
                  {format(new Date(`${selectedDate}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                {selectedEntries.length === 0 ? (
                  <p className="text-sm text-stone-400">Aucune cotisation ce jour-là.</p>
                ) : (
                  selectedEntries.map((e) => (
                    <Link
                      key={e.id}
                      href={`/tontines/${e.tontineId}/cotisations?cycle=${e.periodIndex}`}
                      className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
                    >
                      <div>
                        <p className="font-medium text-stone-900">{e.tontineName}</p>
                        <p className="text-xs text-stone-500">Tour {e.periodIndex}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={e.isPaid ? "default" : e.isLate ? "destructive" : "warning"}>
                          {e.isPaid ? "Payé" : e.isLate ? "En retard" : "En attente"}
                        </Badge>
                        <span className="font-medium text-stone-700">{formatXof(e.amountDueXof)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
                Prochaines cotisations
              </h2>
              <button
                type="button"
                onClick={() => setTab("list")}
                className="text-sm font-medium text-brand hover:underline"
              >
                Voir tout
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {upcoming.length === 0 && (
                <p className="text-sm text-stone-500">Aucune cotisation en attente. 🎉</p>
              )}
              {upcoming.map((e) => (
                <Link
                  key={e.id}
                  href={`/tontines/${e.tontineId}/cotisations?cycle=${e.periodIndex}`}
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50"
                >
                  <div>
                    <p className="font-medium text-stone-900">{e.tontineName}</p>
                    <p className="text-xs text-stone-500">
                      {format(new Date(`${e.dateISO}T00:00:00`), "d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.isLate ? "destructive" : "warning"}>
                      {e.isLate ? "En retard" : "En attente"}
                    </Badge>
                    <span className="font-medium text-stone-700">{formatXof(e.amountDueXof)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <ListView entries={entries} />
      )}
    </div>
  );
}

function ListView({ entries }: { entries: CalendarEntry[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      if (!map.has(e.dateISO)) map.set(e.dateISO, []);
      map.get(e.dateISO)!.push(e);
    }
    return [...map.entries()];
  }, [entries]);

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-stone-500">
          Aucune cotisation à venir pour le moment.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([dateISO, items]) => (
        <div key={dateISO} className="flex flex-col gap-2">
          <p className="text-sm font-medium capitalize text-stone-500">
            {format(new Date(`${dateISO}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <div className="flex flex-col gap-2">
            {items.map((e) => (
              <Link key={e.id} href={`/tontines/${e.tontineId}/cotisations?cycle=${e.periodIndex}`}>
                <Card accent={!e.isPaid}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium text-stone-900">{e.tontineName}</p>
                      <p className="text-xs text-stone-500">Tour {e.periodIndex}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={e.isPaid ? "default" : e.isLate ? "destructive" : "warning"}>
                        {e.isPaid ? "Payé" : e.isLate ? "En retard" : "En attente"}
                      </Badge>
                      <span className="text-sm font-medium text-stone-700">
                        {formatXof(e.amountDueXof)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
