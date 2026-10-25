"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Vote } from "lucide-react";
import { voteForBeneficiaryAction, closeBeneficiaryVoteAction } from "@/app/actions/tontines";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type Candidate = { membershipId: string; fullName: string; voteCount: number };

export function BeneficiaryVoteCard({
  tontineId,
  cycleId,
  periodIndex,
  candidates,
  myVoteMembershipId,
  canClose,
}: {
  tontineId: string;
  cycleId: string;
  periodIndex: number;
  candidates: Candidate[];
  myVoteMembershipId: string | null;
  canClose: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function vote(candidateMembershipId: string) {
    setSubmitting(candidateMembershipId);
    setError(null);
    try {
      const res = await voteForBeneficiaryAction(tontineId, cycleId, candidateMembershipId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  async function closeVote() {
    if (!window.confirm(`Clôturer le vote du tour ${periodIndex} ? Le candidat en tête sera désigné bénéficiaire.`)) {
      return;
    }
    setSubmitting("__close__");
    setError(null);
    try {
      const res = await closeBeneficiaryVoteAction(tontineId, cycleId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(`${res.data.winnerName} désigné(e) bénéficiaire (${res.data.voteCount} vote(s)).`);
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        <Vote className="h-3.5 w-3.5 text-[var(--brand-gold)]" /> Vote collectif en cours
      </p>
      {error && <Alert variant="destructive">{error}</Alert>}
      {result && <Alert variant="success">{result}</Alert>}
      <div className="flex flex-col gap-1">
        {candidates.map((c) => (
          <button
            key={c.membershipId}
            type="button"
            disabled={submitting !== null}
            onClick={() => vote(c.membershipId)}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
              myVoteMembershipId === c.membershipId
                ? "border-[var(--brand-gold)] bg-amber-50"
                : "border-stone-200 hover:bg-stone-50"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {myVoteMembershipId === c.membershipId && <Check className="h-3.5 w-3.5 text-[var(--brand-gold)]" />}
              {c.fullName}
            </span>
            <span className="text-stone-500">
              {c.voteCount} voix
            </span>
          </button>
        ))}
      </div>
      {canClose && (
        <Button type="button" variant="outline" size="sm" disabled={submitting !== null} onClick={closeVote}>
          Clôturer le vote
        </Button>
      )}
    </div>
  );
}
