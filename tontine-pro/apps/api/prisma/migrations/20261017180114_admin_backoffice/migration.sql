-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'super_admin');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "LedgerCorrectionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "tontines" ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_reason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_reason" TEXT;

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "raised_by_user_id" TEXT NOT NULL,
    "contribution_id" TEXT,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolved_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_corrections" (
    "id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "original_tx_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "corrected_account" TEXT NOT NULL,
    "corrected_debit" BIGINT NOT NULL DEFAULT 0,
    "corrected_credit" BIGINT NOT NULL DEFAULT 0,
    "status" "LedgerCorrectionStatus" NOT NULL DEFAULT 'pending',
    "proposed_by_admin_id" TEXT NOT NULL,
    "approved_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "ledger_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_admin_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_corrections" ADD CONSTRAINT "ledger_corrections_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_corrections" ADD CONSTRAINT "ledger_corrections_proposed_by_admin_id_fkey" FOREIGN KEY ("proposed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_corrections" ADD CONSTRAINT "ledger_corrections_approved_by_admin_id_fkey" FOREIGN KEY ("approved_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
