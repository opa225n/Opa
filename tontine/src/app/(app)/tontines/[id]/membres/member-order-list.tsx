"use client";

import { useState, useTransition } from "react";
import { reorderMembersAction, removeMemberAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MEMBER_ROLE_LABELS } from "@/lib/labels";

export interface MemberRow {
  id: string;
  role: string;
  fullName: string;
  phone: string;
  isSelf: boolean;
}

export function MemberOrderList({
  tontineId,
  initialMembers,
  canManage,
  canReorder,
}: {
  tontineId: string;
  initialMembers: MemberRow[];
  canManage: boolean;
  canReorder: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    [next[index], next[target]] = [next[target], next[index]];
    setMembers(next);
    startTransition(async () => {
      const result = await reorderMembersAction(tontineId, next.map((m) => m.id));
      if (!result.ok) setError(result.error);
    });
  }

  function handleRemove(membershipId: string) {
    const reason = window.prompt("Motif du retrait de ce membre :") ?? "";
    startTransition(async () => {
      const result = await removeMemberAction(membershipId, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ol className="flex flex-col gap-2">
        {members.map((m, index) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-stone-900">
                  {m.fullName} {m.isSelf && <span className="text-stone-400">(vous)</span>}
                </p>
                <p className="text-xs text-stone-500">{m.phone}</p>
              </div>
              <Badge variant="outline">{MEMBER_ROLE_LABELS[m.role]}</Badge>
            </div>
            <div className="flex items-center gap-1">
              {canReorder && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Monter"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending || index === members.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Descendre"
                  >
                    ↓
                  </Button>
                </>
              )}
              {canManage && !m.isSelf && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRemove(m.id)}
                  className="text-red-600"
                >
                  Retirer
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
