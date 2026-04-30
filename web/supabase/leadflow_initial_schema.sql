-- LeadFlow application schema for PostgreSQL (Supabase).
-- Generated from prisma/schema.prisma via `prisma migrate diff --from-empty`.
-- Prefer applying schema with: `cd web && npx prisma migrate deploy` against DATABASE_URL.
-- Optional: Supabase Dashboard → SQL Editor → paste and run on an empty database only.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authUserId" TEXT,
    "passwordHash" TEXT,
    "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" TEXT,
    "teamId" TEXT,
    "analystTeamName" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mainTeamLeadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamWhatsApp" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "leadEmail" TEXT,
    "country" TEXT,
    "city" TEXT,
    "source" TEXT NOT NULL,
    "sourceWebsiteName" TEXT,
    "sourceMetaProfileName" TEXT,
    "notes" TEXT,
    "lostNotes" TEXT,
    "qualificationStatus" TEXT NOT NULL,
    "leadScore" INTEGER,
    "salesStage" TEXT NOT NULL DEFAULT 'PRE_SALES',
    "createdById" TEXT NOT NULL,
    "assignedMainTeamLeadId" TEXT,
    "teamId" TEXT,
    "assignedSalesExecId" TEXT,
    "execAssignedAt" TIMESTAMP(3),
    "execDeadlineAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "estimatedDealValue" DECIMAL(15,2),
    "closedRevenue" DECIMAL(15,2),
    "dealCurrency" TEXT NOT NULL DEFAULT 'USD',
    "internalReassignCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadHandoffLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" TEXT,

    CONSTRAINT "LeadHandoffLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesExecTeamTransfer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesExecId" TEXT NOT NULL,
    "fromTeamId" TEXT,
    "toTeamId" TEXT NOT NULL,
    "transferredById" TEXT NOT NULL,

    CONSTRAINT "SalesExecTeamTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_mainTeamLeadId_key" ON "Team"("mainTeamLeadId");

-- CreateIndex
CREATE INDEX "TeamWhatsApp_teamId_idx" ON "TeamWhatsApp"("teamId");

-- CreateIndex
CREATE INDEX "LeadHandoffLog_leadId_createdAt_idx" ON "LeadHandoffLog"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesExecTeamTransfer_createdAt_idx" ON "SalesExecTeamTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "SalesExecTeamTransfer_salesExecId_idx" ON "SalesExecTeamTransfer"("salesExecId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_mainTeamLeadId_fkey" FOREIGN KEY ("mainTeamLeadId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWhatsApp" ADD CONSTRAINT "TeamWhatsApp_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedMainTeamLeadId_fkey" FOREIGN KEY ("assignedMainTeamLeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedSalesExecId_fkey" FOREIGN KEY ("assignedSalesExecId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadHandoffLog" ADD CONSTRAINT "LeadHandoffLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadHandoffLog" ADD CONSTRAINT "LeadHandoffLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesExecTeamTransfer" ADD CONSTRAINT "SalesExecTeamTransfer_salesExecId_fkey" FOREIGN KEY ("salesExecId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesExecTeamTransfer" ADD CONSTRAINT "SalesExecTeamTransfer_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesExecTeamTransfer" ADD CONSTRAINT "SalesExecTeamTransfer_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesExecTeamTransfer" ADD CONSTRAINT "SalesExecTeamTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
