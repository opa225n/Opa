-- AlterTable
ALTER TABLE "Tontine" ADD COLUMN "latePenaltyAmountXof" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tontine" ADD COLUMN "latePenaltyGraceDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN "penaltyXof" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Contribution" ADD COLUMN "penaltyAppliedAt" TIMESTAMP(3);
