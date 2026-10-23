-- DropIndex
DROP INDEX "User_managedByUserId_idx";

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "contactPhone" TEXT;
