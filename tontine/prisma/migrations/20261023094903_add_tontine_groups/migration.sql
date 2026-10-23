-- CreateTable
CREATE TABLE "TontineGroup" (
    "id" TEXT NOT NULL,
    "tontineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weekday" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TontineGroup_tontineId_idx" ON "TontineGroup"("tontineId");

-- CreateIndex
CREATE UNIQUE INDEX "TontineGroup_tontineId_name_key" ON "TontineGroup"("tontineId", "name");

-- AddForeignKey
ALTER TABLE "TontineGroup" ADD CONSTRAINT "TontineGroup_tontineId_fkey" FOREIGN KEY ("tontineId") REFERENCES "Tontine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TontineMembership" ADD COLUMN "groupId" TEXT;

-- AddForeignKey
ALTER TABLE "TontineMembership" ADD CONSTRAINT "TontineMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TontineGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TontineCycle" ADD COLUMN "groupId" TEXT;

-- DropIndex
DROP INDEX "TontineCycle_tontineId_periodIndex_key";

-- CreateIndex
CREATE UNIQUE INDEX "TontineCycle_tontineId_groupId_periodIndex_key" ON "TontineCycle"("tontineId", "groupId", "periodIndex");

-- CreateIndex
CREATE INDEX "TontineCycle_groupId_idx" ON "TontineCycle"("groupId");

-- AddForeignKey
ALTER TABLE "TontineCycle" ADD CONSTRAINT "TontineCycle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TontineGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
