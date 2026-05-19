CREATE TYPE "WorkdayOverrideType" AS ENUM ('HOLIDAY', 'SPECIAL_WORKDAY');

CREATE TABLE "WorkdayOverride" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "type" "WorkdayOverrideType" NOT NULL,
  "label" TEXT NOT NULL,
  "startTime" VARCHAR(5),
  "endTime" VARCHAR(5),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkdayOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkdayOverride_date_key" ON "WorkdayOverride"("date");
CREATE INDEX "WorkdayOverride_date_type_idx" ON "WorkdayOverride"("date", "type");

ALTER TABLE "WorkdayOverride"
ADD CONSTRAINT "WorkdayOverride_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
