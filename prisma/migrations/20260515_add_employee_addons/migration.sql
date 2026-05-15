CREATE TYPE "AddonType" AS ENUM (
  'TALENT_KONTEN',
  'MOTRET_TPW',
  'MOTRET_PHS',
  'MOTRET_JV',
  'ASSIST_MAKEUP',
  'LUAR_KOTA'
);

CREATE TABLE "EmployeeAddon" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addonDate" DATE NOT NULL,
  "addonType" "AddonType" NOT NULL,
  "addonQuantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmployeeAddon_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeAddon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmployeeAddon_addonDate_idx" ON "EmployeeAddon"("addonDate");
CREATE INDEX "EmployeeAddon_userId_addonDate_idx" ON "EmployeeAddon"("userId", "addonDate");
