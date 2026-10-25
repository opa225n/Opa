/**
 * Dépouillement du vote collectif de bénéficiaire (Tontine.beneficiarySelectionMode = VOTE).
 * Le gagnant est le candidat avec le plus de voix ; en cas d'égalité (ou zéro vote), le candidat
 * le plus proche dans la file (candidateIds doit être trié par periodIndex croissant) l'emporte —
 * comportement identique à l'ordre fixe par défaut quand personne n'a voté.
 */
export function tallyBeneficiaryVotes(
  candidateIds: string[],
  votes: { candidateMembershipId: string }[]
): string {
  const counts = new Map<string, number>(candidateIds.map((id) => [id, 0]));
  for (const vote of votes) {
    if (counts.has(vote.candidateMembershipId)) {
      counts.set(vote.candidateMembershipId, counts.get(vote.candidateMembershipId)! + 1);
    }
  }
  let winner = candidateIds[0];
  let best = -1;
  for (const id of candidateIds) {
    const count = counts.get(id)!;
    if (count > best) {
      best = count;
      winner = id;
    }
  }
  return winner;
}
