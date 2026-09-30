-- AlterTable
ALTER TABLE "Presence" ADD COLUMN "secret" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Presence" ADD COLUMN "partnerId" TEXT;

-- CreateTable
CREATE TABLE "Knock" (
    "id" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Knock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Knock_toId_fromId_key" ON "Knock"("toId", "fromId");
CREATE INDEX "Knock_toId_idx" ON "Knock"("toId");
