import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

export interface LedgerLine {
  account: string;
  debit?: bigint;
  credit?: bigint;
  reason: string;
}

// Toute transaction du grand livre doit être équilibrée (Σdébits = Σcrédits), écrite d'un bloc,
// et jamais modifiée ensuite (cf. TRD : trigger ledger_balanced, REVOKE UPDATE/DELETE).
// Ici la vérification d'équilibre est faite applicativement avant l'écriture (porte d'entrée unique :
// writeLedgerTransaction), ce qui reproduit la garantie du trigger Postgres sans dépendre d'un trigger SQL.
export async function writeLedgerTransaction(
  tx: Prisma.TransactionClient,
  tontineId: string,
  lines: LedgerLine[],
  opts: { roundId?: string; paymentId?: string } = {},
) {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0n), 0n);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0n), 0n);
  if (totalDebit !== totalCredit) {
    throw new Error(
      `Transaction du grand livre déséquilibrée : débit=${totalDebit} crédit=${totalCredit}`,
    );
  }
  const txId = randomUUID();
  await tx.ledgerEntry.createMany({
    data: lines.map((l) => ({
      txId,
      tontineId,
      roundId: opts.roundId,
      paymentId: opts.paymentId,
      account: l.account,
      debit: l.debit ?? 0n,
      credit: l.credit ?? 0n,
      reason: l.reason,
    })),
  });
  return txId;
}

export const Accounts = {
  providerClearing: "provider_clearing",
  contributionsReceived: (tontineId: string) => `contributions_received:${tontineId}`,
  feesCollected: "fees_collected",
  penaltiesCollected: "penalties_collected",
  potPayable: (tontineId: string) => `pot_payable:${tontineId}`,
};
