CREATE INDEX IF NOT EXISTS "Attendance_date_checkOut_idx"
  ON "Attendance" ("date", "checkOut");

CREATE INDEX IF NOT EXISTS "DailyProgress_userId_closing_canceledAt_createdAt_idx"
  ON "DailyProgress" ("userId", "closing", "canceledAt", "createdAt");

CREATE INDEX IF NOT EXISTS "DailyProgress_userId_targetSelesai_idx"
  ON "DailyProgress" ("userId", "targetSelesai");

CREATE INDEX IF NOT EXISTS "DailyProgress_userId_tanggalMulai_idx"
  ON "DailyProgress" ("userId", "tanggalMulai");

CREATE INDEX IF NOT EXISTS "DailyProgress_userId_tanggalSelesai_idx"
  ON "DailyProgress" ("userId", "tanggalSelesai");

CREATE INDEX IF NOT EXISTS "DailyProgress_userId_tanggalRevisi_idx"
  ON "DailyProgress" ("userId", "tanggalRevisi");

CREATE INDEX IF NOT EXISTS "DailyProgress_userId_revisiDone_idx"
  ON "DailyProgress" ("userId", "revisiDone");

CREATE INDEX IF NOT EXISTS "DailyProgress_closing_canceledAt_createdAt_idx"
  ON "DailyProgress" ("closing", "canceledAt", "createdAt");

CREATE INDEX IF NOT EXISTS "DailyProgress_closing_hiddenFromDashboard_canceledAt_updatedAt_idx"
  ON "DailyProgress" ("closing", "hiddenFromDashboard", "canceledAt", "updatedAt");

CREATE INDEX IF NOT EXISTS "EmployeeAddon_addonDate_createdAt_idx"
  ON "EmployeeAddon" ("addonDate", "createdAt");
