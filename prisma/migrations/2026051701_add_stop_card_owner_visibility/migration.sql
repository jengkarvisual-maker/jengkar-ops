ALTER TABLE "StopCard"
ADD COLUMN "hiddenFromOwnerDashboard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hiddenFromOwnerDashboardAt" TIMESTAMP(3),
ADD COLUMN "hiddenFromOwnerDashboardByUserId" TEXT;

CREATE INDEX "StopCard_hiddenFromOwnerDashboard_status_createdAt_idx"
ON "StopCard"("hiddenFromOwnerDashboard", "status", "createdAt");

ALTER TABLE "StopCard"
ADD CONSTRAINT "StopCard_hiddenFromOwnerDashboardByUserId_fkey"
FOREIGN KEY ("hiddenFromOwnerDashboardByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
