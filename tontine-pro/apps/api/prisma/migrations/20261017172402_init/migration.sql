-- CreateEnum
CREATE TYPE "TontineStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TontineKind" AS ENUM ('rotating', 'rotating_lottery');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('president', 'treasurer', 'member');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('invited', 'active', 'left', 'removed');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('planned', 'open', 'complete', 'closed', 'payout_pending', 'paid_out', 'archived');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('due', 'pending', 'paid', 'late', 'waived');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('initiated', 'pending', 'succeeded', 'failed', 'expired', 'refunded');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "momo_number" TEXT,
    "momo_operator" TEXT,
    "pin_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tontines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "TontineKind" NOT NULL DEFAULT 'rotating',
    "contribution_amount" BIGINT NOT NULL,
    "frequency" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "max_members" INTEGER NOT NULL,
    "grace_period_hours" INTEGER NOT NULL DEFAULT 24,
    "penalty_rule" JSONB NOT NULL DEFAULT '{}',
    "solidarity_fee_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order_mode" TEXT NOT NULL DEFAULT 'lottery',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Abidjan',
    "status" "TontineStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),

    CONSTRAINT "tontines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'member',
    "status" "MemberStatus" NOT NULL DEFAULT 'invited',
    "joined_at" TIMESTAMP(3),
    "accepted_rules_at" TIMESTAMP(3),
    "rotation_position" INTEGER,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "beneficiary_membership_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "pot_amount" BIGINT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'planned',
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "amount_due" BIGINT NOT NULL,
    "amount_paid" BIGINT NOT NULL DEFAULT 0,
    "penalty_amount" BIGINT NOT NULL DEFAULT 0,
    "status" "ContributionStatus" NOT NULL DEFAULT 'due',
    "paid_at" TIMESTAMP(3),
    "waived_reason" TEXT,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "contribution_id" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'simulated',
    "provider_ref" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "operator" TEXT,
    "amount" BIGINT NOT NULL,
    "fee" BIGINT NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'initiated',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "beneficiary_membership_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "amount" BIGINT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "tx_id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "round_id" TEXT,
    "payment_id" TEXT,
    "account" TEXT NOT NULL,
    "debit" BIGINT NOT NULL DEFAULT 0,
    "credit" BIGINT NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "tontine_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "otp_codes_phone_idx" ON "otp_codes"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tontine_id_user_id_key" ON "memberships"("tontine_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_tontine_id_round_number_key" ON "rounds"("tontine_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_tontine_id_beneficiary_membership_id_key" ON "rounds"("tontine_id", "beneficiary_membership_id");

-- CreateIndex
CREATE INDEX "contributions_status_round_id_idx" ON "contributions"("status", "round_id");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_round_id_membership_id_key" ON "contributions"("round_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_ref_key" ON "payments"("provider", "provider_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_round_id_key" ON "payouts"("round_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_payment_id_key" ON "payouts"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "ledger_entries_tx_id_idx" ON "ledger_entries"("tx_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tontines" ADD CONSTRAINT "tontines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_beneficiary_membership_id_fkey" FOREIGN KEY ("beneficiary_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_beneficiary_membership_id_fkey" FOREIGN KEY ("beneficiary_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
