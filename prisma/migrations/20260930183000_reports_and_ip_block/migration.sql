-- AlterTable
ALTER TABLE "Presence" ADD COLUMN "ipHash" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("ipHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_targetKey_key" ON "Report"("reporterId", "targetKey");
CREATE INDEX "Report_targetKey_idx" ON "Report"("targetKey");
