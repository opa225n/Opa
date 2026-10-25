-- CreateEnum
CREATE TYPE "BeneficiarySelectionMode" AS ENUM ('FIXED', 'VOTE');

-- AlterTable
ALTER TABLE "Tontine" ADD COLUMN     "beneficiarySelectionMode" "BeneficiarySelectionMode" NOT NULL DEFAULT 'FIXED';

-- AlterTable
ALTER TABLE "BeneficiaryOrder" ADD COLUMN     "voteClosedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BeneficiaryVote" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "voterMembershipId" TEXT NOT NULL,
    "candidateMembershipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficiaryVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BeneficiaryVote_cycleId_idx" ON "BeneficiaryVote"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "BeneficiaryVote_cycleId_voterMembershipId_key" ON "BeneficiaryVote"("cycleId", "voterMembershipId");

-- AddForeignKey
ALTER TABLE "BeneficiaryVote" ADD CONSTRAINT "BeneficiaryVote_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TontineCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiaryVote" ADD CONSTRAINT "BeneficiaryVote_voterMembershipId_fkey" FOREIGN KEY ("voterMembershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiaryVote" ADD CONSTRAINT "BeneficiaryVote_candidateMembershipId_fkey" FOREIGN KEY ("candidateMembershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
