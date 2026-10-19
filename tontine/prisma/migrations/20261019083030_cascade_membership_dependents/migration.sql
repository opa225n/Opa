-- DropForeignKey
ALTER TABLE "BeneficiaryOrder" DROP CONSTRAINT "BeneficiaryOrder_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_raisedByMembershipId_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_membershipId_fkey";

-- AddForeignKey
ALTER TABLE "BeneficiaryOrder" ADD CONSTRAINT "BeneficiaryOrder_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedByMembershipId_fkey" FOREIGN KEY ("raisedByMembershipId") REFERENCES "TontineMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
