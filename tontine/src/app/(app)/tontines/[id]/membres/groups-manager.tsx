"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupAction, deleteGroupAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { WEEKDAY_LABELS } from "@/lib/labels";

export interface GroupRow {
  id: string;
  name: string;
  weekday: number | null;
  memberCount: number;
}

export function GroupsManager({
  tontineId,
  initialGroups,
  isCustomWeekly,
}: {
  tontineId: string;
  initialGroups: GroupRow[];
  isCustomWeekly: boolean;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [weekday, setWeekday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGroupAction(
        tontineId,
        name,
        weekday === "" ? null : Number(weekday)
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setWeekday("");
      router.refresh();
    });
  }

  function handleDelete(groupId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteGroupAction(groupId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert variant="destructive">{error}</Alert>}

      {groups.length > 0 && (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-stone-900">{g.name}</span>
                {g.weekday != null && (
                  <span className="ml-2 text-stone-400">{WEEKDAY_LABELS[g.weekday]}</span>
                )}
                <span className="ml-2 text-stone-400">{g.memberCount} membre(s)</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                className="text-red-600"
                onClick={() => handleDelete(g.id)}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-name">Nom du groupe</Label>
          <Input
            id="group-name"
            placeholder="Ex : Groupe 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {isCustomWeekly && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-weekday">Jour</Label>
            <select
              id="group-weekday"
              className="h-11 rounded-lg border border-stone-300 bg-white px-3"
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
            >
              <option value="">—</option>
              {Object.entries(WEEKDAY_LABELS).map(([day, label]) => (
                <option key={day} value={day}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-end">
          <Button type="submit" disabled={isPending || name.trim().length === 0}>
            {isPending ? "..." : "Ajouter un groupe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
