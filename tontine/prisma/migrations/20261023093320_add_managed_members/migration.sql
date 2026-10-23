-- AlterTable
ALTER TABLE "User" ADD COLUMN "isManaged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "managedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "User_managedByUserId_idx" ON "User"("managedByUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedByUserId_fkey" FOREIGN KEY ("managedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
