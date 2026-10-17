/*
  Warnings:

  - You are about to drop the column `corrected_account` on the `ledger_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `corrected_credit` on the `ledger_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `corrected_debit` on the `ledger_corrections` table. All the data in the column will be lost.
  - Added the required column `corrected_lines` to the `ledger_corrections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ledger_corrections" DROP COLUMN "corrected_account",
DROP COLUMN "corrected_credit",
DROP COLUMN "corrected_debit",
ADD COLUMN     "corrected_lines" JSONB NOT NULL;
