-- AlterEnum
ALTER TYPE "Frequency" ADD VALUE 'CUSTOM_WEEKLY';

-- AlterTable
ALTER TABLE "Tontine" ADD COLUMN "customWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
