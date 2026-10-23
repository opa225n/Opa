"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reorderMembersAction,
  removeMemberAction,
  updateMemberBrasAction,
  assignMemberGroupAction,
} from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MEMBER_ROLE_LABELS } from "@/lib/labels";

export interface MemberRow {
  id: string;
  role: string;
  fullName: string;
  phone: string;
  isSelf: boolean;
  bras: number;
  isManaged: boolean;
  groupId: string | null;
}

export interface SelectableGroup {
  id: string;
  name: string;
}

export function MemberOrderList({
  tontineId,
  initialMembers,
  canManage,
  canReorder,
  canEditBras,
  groups,
}: {
  tontineId: string;
  initialMembers: MemberRow[];
  canManage: boolean;
  canReorder: boolean;
  canEditBras: boolean;
  /** Liste des groupes sélectionnables ; omis/vide = pas de gestion de groupes sur cette liste. */
  groups?: SelectableGroup[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeBras(membershipId: string, bras: number) {
    if (!Number.isInteger(bras) || bras < 1 || bras > 10) return;
    setMembers((prev) => prev.map((m) => (m.id === membershipId ? { ...m, bras } : m)));
    startTransition(async () => {
      const result = await updateMemberBrasAction(membershipId, bras);
      if (!result.ok) setError(result.error);
    });
  }

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

  function changeGroup(membershipId: string, groupId: string) {
    startTransition(async () => {
      const result = await assignMemberGroupAction(membershipId, groupId === "" ? null : groupId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
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
                <p className="text-xs text-stone-500">
                  {m.isManaged ? "Géré par vous — sans compte" : m.phone}
                </p>
              </div>
              <Badge variant="outline">{MEMBER_ROLE_LABELS[m.role]}</Badge>
              {canEditBras ? (
                <div className="flex items-center gap-1" aria-label="Nombre de bras">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending || m.bras <= 1}
                    onClick={() => changeBras(m.id, m.bras - 1)}
                    aria-label="Retirer un bras"
                  >
                    −
                  </Button>
                  <span className="min-w-[4.5rem] text-center text-xs text-stone-600">
                    {m.bras} bras
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending || m.bras >= 10}
                    onClick={() => changeBras(m.id, m.bras + 1)}
                    aria-label="Ajouter un bras"
                  >
                    +
                  </Button>
                </div>
              ) : (
                m.bras > 1 && <Badge variant="secondary">{m.bras} bras</Badge>
              )}
              {groups && groups.length > 0 && canEditBras && (
                <select
                  aria-label="Groupe"
                  className="h-8 rounded-md border border-stone-300 bg-white px-2 text-xs"
                  value={m.groupId ?? ""}
                  disabled={isPending}
                  onChange={(e) => changeGroup(m.id, e.target.value)}
                >
                  <option value="">Sans groupe</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
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
