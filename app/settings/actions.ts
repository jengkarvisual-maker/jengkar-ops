"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { UserRole, WorkdayOverrideType } from "@prisma/client";

import {
  canResetManagedPasswords,
  canResetTargetUserPassword,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { isKpiMonthLocked, syncAllKpisForMonth, syncUserKpisForDates } from "@/lib/kpi";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { isValidTimeInput } from "@/lib/workday-overrides";
import {
  buildLegacyArchivedEmail,
  findUserByEmailWithArchiveState,
  findUserByIdWithArchiveState,
  hasUserArchivingColumns,
} from "@/lib/user-archiving";
import {
  addDays,
  formatDate,
  formatMonthYear,
  getAppDateParts,
  parseDateInput,
  startOfMonth,
} from "@/lib/utils";

export type ChangePasswordState = {
  error: string | null;
  success: string | null;
};

export type CreateEmployeeState = {
  error: string | null;
  success: string | null;
};

export type ArchiveEmployeeState = {
  error: string | null;
  success: string | null;
};

export type ResetManagedPasswordState = {
  error: string | null;
  success: string | null;
};

export type LockKpiMonthState = {
  error: string | null;
  success: string | null;
};

export type WorkdayOverrideState = {
  error: string | null;
  success: string | null;
};

export type MaintenancePreview = {
  count: number;
  details?: string[];
  summary: string;
};

export type MaintenanceActionState = {
  error: string | null;
  success: string | null;
  preview: MaintenancePreview | null;
};

type MaintenanceRange = {
  fromDate: Date;
  toDate: Date;
  toExclusive: Date;
};

type MaintenanceRangeResult =
  | {
      ok: true;
      value: MaintenanceRange;
    }
  | {
      ok: false;
      state: MaintenanceActionState;
    };

const OPS_DASHBOARD_TAG = "ops-dashboard";
const OPS_SETTINGS_TAG = "ops-settings";

function refreshDashboard() {
  revalidateTag(OPS_DASHBOARD_TAG, "max");
  revalidatePath("/dashboard");
}

function refreshSettings() {
  revalidateTag(OPS_SETTINGS_TAG, "max");
  revalidatePath("/settings");
}

function refreshDashboardAndSettings() {
  refreshDashboard();
  refreshSettings();
}

function ensureOwner(user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  if (user.role !== UserRole.OWNER) {
    return {
      error: "Hanya Owner yang dapat menjalankan maintenance data.",
      success: null,
      preview: null,
    } satisfies MaintenanceActionState;
  }

  return null;
}

function normalizeName(input: FormDataEntryValue | null) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(input: FormDataEntryValue | null) {
  return String(input ?? "").trim().toLowerCase();
}

function normalizeMonthKey(input: FormDataEntryValue | null) {
  return String(input ?? "").trim();
}

function normalizeOptionalText(input: FormDataEntryValue | null) {
  const value = String(input ?? "").trim();
  return value.length > 0 ? value : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ensureOwnerSettingsAction(
  user: Awaited<ReturnType<typeof requireAuthenticatedUser>>,
): WorkdayOverrideState | null {
  if (user.role !== UserRole.OWNER) {
    return {
      error: "Hanya Owner yang dapat mengubah kalender kerja khusus.",
      success: null,
    };
  }

  return null;
}

function parseMonthKey(monthKey: string) {
  const matched = monthKey.match(/^(\d{4})-(\d{1,2})$/);

  if (!matched) {
    return null;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function parseMaintenanceRange(formData: FormData): MaintenanceRangeResult {
  const fromDate = parseDateInput(formData.get("fromDate"));
  const toDate = parseDateInput(formData.get("toDate"));

  if (!fromDate || !toDate) {
    return {
      ok: false,
      state: {
        error: "Tanggal mulai dan tanggal akhir wajib diisi.",
        success: null,
        preview: null,
      },
    };
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return {
      ok: false,
      state: {
        error: "Tanggal mulai tidak boleh melewati tanggal akhir.",
        success: null,
        preview: null,
      },
    };
  }

  return {
    ok: true,
    value: {
      fromDate,
      toDate,
      toExclusive: addDays(toDate, 1),
    },
  };
}

function requireDeleteConfirmation(formData: FormData) {
  const confirmationText = String(formData.get("confirmationText") ?? "").trim().toUpperCase();

  if (confirmationText !== "HAPUS") {
    return {
      error: 'Ketik "HAPUS" untuk mengonfirmasi pembersihan data.',
      success: null,
      preview: null,
    } satisfies MaintenanceActionState;
  }

  return null;
}

function sortYearMonths(keys: Iterable<string>) {
  return Array.from(keys)
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month };
    })
    .sort((left, right) => {
      if (left.year !== right.year) {
        return left.year - right.year;
      }

      return left.month - right.month;
    });
}

function buildAttendanceProtectionPreview(
  rows: Array<{
    date: Date;
    userId: string;
  }>,
) {
  if (rows.length === 0) {
    return {
      details: [
        "Tidak ada absensi pada periode ini, sehingga tidak ada snapshot KPI yang perlu diamankan.",
      ],
      protectedUserCount: 0,
      protectedUserMonthCount: 0,
    };
  }

  const protectedUserIds = new Set<string>();
  const protectedUserMonthKeys = new Set<string>();
  const affectedMonthKeys = new Set<string>();

  rows.forEach((row) => {
    const { year, month } = getAppDateParts(row.date);
    protectedUserIds.add(row.userId);
    protectedUserMonthKeys.add(`${row.userId}-${year}-${month}`);
    affectedMonthKeys.add(`${year}-${month}`);
  });

  const affectedMonths = sortYearMonths(affectedMonthKeys).map(({ year, month }) =>
    formatMonthYear(month, year),
  );

  return {
    details: [
      `${protectedUserMonthKeys.size} kombinasi user-bulan KPI akan diamankan dari ${protectedUserIds.size} karyawan.`,
      `Bulan KPI terdampak: ${affectedMonths.join(", ")}.`,
    ],
    protectedUserCount: protectedUserIds.size,
    protectedUserMonthCount: protectedUserMonthKeys.size,
  };
}

export async function attendanceMaintenanceAction(
  _previousState: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwner(user);

  if (ownerError) {
    return ownerError;
  }

  const range = parseMaintenanceRange(formData);

  if (!range.ok) {
    return range.state;
  }

  const intent = String(formData.get("intent") ?? "preview");
  const where = {
    date: {
      gte: range.value.fromDate,
      lt: range.value.toExclusive,
    },
  } as const;

  const attendanceRows = await prisma.attendance.findMany({
    where,
    select: {
      userId: true,
      date: true,
    },
  });

  const count = attendanceRows.length;
  const summary = `${count} riwayat absensi pada ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}.`;
  const protectionPreview = buildAttendanceProtectionPreview(attendanceRows);
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthParts = getAppDateParts(currentMonthStart);
  const currentMonthLabel = formatMonthYear(currentMonthParts.month, currentMonthParts.year);
  const touchesCurrentMonth = range.value.toExclusive.getTime() > currentMonthStart.getTime();

  if (intent !== "delete") {
    return {
      error: null,
      success: null,
      preview: {
        count,
        details: touchesCurrentMonth
          ? [
              ...protectionPreview.details,
              `Rentang ini masih menyentuh bulan berjalan (${currentMonthLabel}), jadi delete akan ditolak. Pilih akhir periode sebelum bulan ini.`,
            ]
          : protectionPreview.details,
        summary: `${summary} Hanya periode sebelum bulan berjalan yang dapat dihapus agar KPI aktif tidak berubah.`,
      },
    };
  }

  if (range.value.toExclusive.getTime() > currentMonthStart.getTime()) {
    return {
      error:
        "Riwayat absensi hanya boleh dibersihkan untuk bulan yang sudah lewat. Bulan berjalan dikunci agar hasil KPI karyawan tidak berubah.",
      success: null,
      preview: {
        count,
        details: [
          ...protectionPreview.details,
          `Periode aman terakhir saat ini adalah sampai akhir ${formatMonthYear(
            currentMonthParts.month === 1 ? 12 : currentMonthParts.month - 1,
            currentMonthParts.month === 1 ? currentMonthParts.year - 1 : currentMonthParts.year,
          )}.`,
        ],
        summary,
      },
    };
  }

  const confirmationError = requireDeleteConfirmation(formData);

  if (confirmationError) {
    return confirmationError;
  }

  const userDatesMap = new Map<string, Date[]>();

  attendanceRows.forEach((row) => {
    const existingDates = userDatesMap.get(row.userId) ?? [];
    existingDates.push(row.date);
    userDatesMap.set(row.userId, existingDates);
  });

  await Promise.all(
    Array.from(userDatesMap.entries()).map(([userId, dates]) =>
      syncUserKpisForDates(userId, dates),
    ),
  );

  const result = await prisma.attendance.deleteMany({ where });

  refreshDashboardAndSettings();

  return {
    error: null,
    success: `${result.count} riwayat absensi berhasil dihapus untuk periode ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}. ${protectionPreview.protectedUserMonthCount} kombinasi user-bulan KPI dari ${protectionPreview.protectedUserCount} karyawan sudah diamankan terlebih dahulu.`,
    preview: {
      count,
      details: protectionPreview.details,
      summary,
    },
  };
}

export async function hiddenProgressMaintenanceAction(
  _previousState: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwner(user);

  if (ownerError) {
    return ownerError;
  }

  const range = parseMaintenanceRange(formData);

  if (!range.ok) {
    return range.state;
  }

  const intent = String(formData.get("intent") ?? "preview");
  const where = {
    closing: true,
    hiddenFromDashboard: true,
    OR: [
      {
        tanggalSelesai: {
          gte: range.value.fromDate,
          lt: range.value.toExclusive,
        },
      },
      {
        AND: [
          {
            tanggalSelesai: null,
          },
          {
            createdAt: {
              gte: range.value.fromDate,
              lt: range.value.toExclusive,
            },
          },
        ],
      },
    ],
  };

  const count = await prisma.dailyProgress.count({ where });
  const summary = `${count} progress closing yang sudah disembunyikan pada ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}. Nilai KPI bulanan/tahunan yang sudah tersimpan tidak diubah.`;

  if (intent !== "delete") {
    return {
      error: null,
      success: null,
      preview: {
        count,
        summary,
      },
    };
  }

  const confirmationError = requireDeleteConfirmation(formData);

  if (confirmationError) {
    return confirmationError;
  }

  const result = await prisma.dailyProgress.deleteMany({ where });

  refreshDashboardAndSettings();

  return {
    error: null,
    success: `${result.count} progress closing tersembunyi berhasil dihapus untuk periode ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}.`,
    preview: {
      count,
      summary,
    },
  };
}

export async function createEmployeeAction(
  _previousState: CreateEmployeeState,
  formData: FormData,
): Promise<CreateEmployeeState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwner(user);

  if (ownerError) {
    return {
      error: ownerError.error,
      success: null,
    };
  }

  const name = normalizeName(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password || !confirmPassword) {
    return {
      error: "Nama lengkap, email, password, dan konfirmasi password wajib diisi.",
      success: null,
    };
  }

  if (name.length < 3) {
    return {
      error: "Nama lengkap minimal 3 karakter.",
      success: null,
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Format email belum valid.",
      success: null,
    };
  }

  if (password.length < 8) {
    return {
      error: "Password awal minimal 8 karakter.",
      success: null,
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Konfirmasi password belum sama.",
      success: null,
    };
  }

  const isOperationalEmail = EXCLUDED_OPERATIONAL_EMAILS.some(
    (operationalEmail) => operationalEmail === email,
  );

  if (isOperationalEmail) {
    return {
      error:
        "Email ini dipakai untuk akun operasional. Gunakan email khusus karyawan baru agar masuk ke daftar tim.",
      success: null,
    };
  }

  const supportsUserArchiving = await hasUserArchivingColumns();
  const existingProfile = await findUserByEmailWithArchiveState(email);

  const canReactivateArchivedProfile = Boolean(
    supportsUserArchiving &&
    existingProfile &&
    !existingProfile.isActive &&
    existingProfile.role === UserRole.KARYAWAN,
  );

  if (existingProfile && !canReactivateArchivedProfile) {
    return {
      error: "Email ini sudah terdaftar di aplikasi OPS.",
      success: null,
    };
  }

  try {
    const passwordHash = hashPassword(password);

    if (existingProfile && canReactivateArchivedProfile) {
      await prisma.user.update({
        where: {
          id: existingProfile.id,
        },
        data: {
          name,
          role: UserRole.KARYAWAN,
          passwordHash,
          authUserId: null,
          ...(supportsUserArchiving
            ? {
                isActive: true,
                archivedAt: null,
              }
            : {}),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          role: UserRole.KARYAWAN,
          passwordHash,
          authUserId: null,
          ...(supportsUserArchiving
            ? {
                isActive: true,
              }
            : {}),
        },
      });
    }
  } catch (error) {
    console.error("createEmployeeAction", error);

    return {
      error:
        "Akun baru belum berhasil disimpan. Silakan cek koneksi database OPS lalu coba lagi.",
      success: null,
    };
  }

  refreshDashboardAndSettings();

  return {
    error: null,
    success: canReactivateArchivedProfile
      ? `${name} berhasil diaktifkan kembali sebagai karyawan dan sudah bisa login lagi dengan email ${email}.`
      : `${name} berhasil ditambahkan sebagai karyawan baru dan sudah bisa login dengan email ${email}.`,
  };
}

export async function archiveEmployeeAction(
  _previousState: ArchiveEmployeeState,
  formData: FormData,
): Promise<ArchiveEmployeeState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwner(user);

  if (ownerError) {
    return {
      error: ownerError.error,
      success: null,
    };
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!targetUserId) {
    return {
      error: "Akun karyawan yang ingin dihapus belum valid.",
      success: null,
    };
  }

  const supportsUserArchiving = await hasUserArchivingColumns();

  const targetUser = await findUserByIdWithArchiveState(targetUserId);

  if (!targetUser || targetUser.role !== UserRole.KARYAWAN) {
    return {
      error: "Akun karyawan tidak ditemukan.",
      success: null,
    };
  }

  if (EXCLUDED_OPERATIONAL_EMAILS.includes(targetUser.email as (typeof EXCLUDED_OPERATIONAL_EMAILS)[number])) {
    return {
      error: "Akun operasional tidak bisa dihapus dari daftar karyawan aktif.",
      success: null,
    };
  }

  if (!targetUser.isActive) {
    return {
      error: null,
      success: `${targetUser.name} sudah dinonaktifkan sebelumnya.`,
    };
  }

  if (supportsUserArchiving) {
    await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        authUserId: null,
        email: buildLegacyArchivedEmail(targetUser.email, targetUser.id),
      },
    });
  }

  await prisma.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      authUserId: null,
      passwordHash: null,
    },
  });

  const authCleanupMessage =
    "Akun dinonaktifkan dan akses login lokal OPS sudah dicabut.";

  refreshDashboardAndSettings();

  return {
    error: null,
    success: `${targetUser.name} berhasil dihapus dari daftar karyawan aktif. ${authCleanupMessage}`,
  };
}

export async function resetManagedPasswordAction(
  _previousState: ResetManagedPasswordState,
  formData: FormData,
): Promise<ResetManagedPasswordState> {
  const user = await requireAuthenticatedUser();

  if (!canResetManagedPasswords(user.role)) {
    return {
      error: "Hanya Owner atau Admin yang dapat membantu reset password akun lain.",
      success: null,
    };
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!targetUserId || !newPassword || !confirmPassword) {
    return {
      error: "Pilih akun tujuan, lalu isi password baru dan konfirmasinya.",
      success: null,
    };
  }

  if (newPassword.length < 8) {
    return {
      error: "Password baru minimal 8 karakter.",
      success: null,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "Konfirmasi password belum sama.",
      success: null,
    };
  }

  const targetUser = await findUserByIdWithArchiveState(targetUserId);

  if (!targetUser) {
    return {
      error: "Akun tujuan tidak ditemukan.",
      success: null,
    };
  }

  if (!targetUser.isActive) {
    return {
      error: "Akun tujuan sudah dinonaktifkan, jadi password tidak perlu direset.",
      success: null,
    };
  }

  if (!canResetTargetUserPassword(user.role, targetUser.role)) {
    return {
      error:
        user.role === UserRole.ADMIN
          ? "Admin hanya dapat reset password akun karyawan."
          : "Owner hanya dapat reset password akun admin atau karyawan.",
      success: null,
    };
  }

  await prisma.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      passwordHash: hashPassword(newPassword),
      authUserId: null,
    },
  });

  refreshSettings();

  return {
    error: null,
    success: `Password untuk ${targetUser.name} berhasil direset. Berikan password baru ini secara aman kepada pemilik akun.`,
  };
}

export async function lockKpiMonthAction(
  _previousState: LockKpiMonthState,
  formData: FormData,
): Promise<LockKpiMonthState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwner(user);

  if (ownerError) {
    return {
      error: ownerError.error,
      success: null,
    };
  }

  const monthKey = normalizeMonthKey(formData.get("monthKey"));
  const parsedMonth = parseMonthKey(monthKey);

  if (!parsedMonth) {
    return {
      error: "Periode KPI yang ingin dikunci belum valid.",
      success: null,
    };
  }

  const currentParts = getAppDateParts(new Date());

  if (
    parsedMonth.year > currentParts.year ||
    (parsedMonth.year === currentParts.year && parsedMonth.month >= currentParts.month)
  ) {
    return {
      error: "Hanya bulan yang sudah selesai yang dapat dikunci.",
      success: null,
    };
  }

  if (await isKpiMonthLocked(parsedMonth.year, parsedMonth.month)) {
    return {
      error: `KPI ${formatMonthYear(parsedMonth.month, parsedMonth.year)} sudah terkunci sebelumnya.`,
      success: null,
    };
  }

  await syncAllKpisForMonth(parsedMonth.year, parsedMonth.month);

  await prisma.kpiMonthLock.create({
    data: {
      year: parsedMonth.year,
      month: parsedMonth.month,
      lockedByUserId: user.id,
    },
  });

  refreshDashboardAndSettings();

  return {
    error: null,
    success: `KPI ${formatMonthYear(parsedMonth.month, parsedMonth.year)} berhasil dikunci. Perubahan absensi atau progres lama setelah ini tidak akan menggeser hasil evaluasi periode tersebut.`,
  };
}

export async function upsertWorkdayOverrideAction(
  _previousState: WorkdayOverrideState,
  formData: FormData,
): Promise<WorkdayOverrideState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwnerSettingsAction(user);

  if (ownerError) {
    return ownerError;
  }

  const date = parseDateInput(formData.get("date"));
  const typeInput = normalizeMonthKey(formData.get("type"));
  const label = String(formData.get("label") ?? "").trim();
  const startTime = normalizeOptionalText(formData.get("startTime"));
  const endTime = normalizeOptionalText(formData.get("endTime"));

  if (!date) {
    return {
      error: "Tanggal override kerja belum valid.",
      success: null,
    };
  }

  if (typeInput !== WorkdayOverrideType.HOLIDAY && typeInput !== WorkdayOverrideType.SPECIAL_WORKDAY) {
    return {
      error: "Tipe override kerja belum valid.",
      success: null,
    };
  }

  if (!label || label.length < 3) {
    return {
      error: "Label hari kerja/libur minimal 3 karakter.",
      success: null,
    };
  }

  if (typeInput === WorkdayOverrideType.SPECIAL_WORKDAY) {
    if (!startTime || !endTime) {
      return {
        error: "Hari kerja khusus wajib memiliki jam mulai dan jam selesai.",
        success: null,
      };
    }

    if (!isValidTimeInput(startTime) || !isValidTimeInput(endTime)) {
      return {
        error: "Format jam harus HH:MM, contoh 09:00 atau 16:00.",
        success: null,
      };
    }

    if (startTime >= endTime) {
      return {
        error: "Jam selesai harus lebih besar dari jam mulai.",
        success: null,
      };
    }
  }

  await prisma.workdayOverride.upsert({
    where: {
      date,
    },
    update: {
      type: typeInput,
      label,
      startTime: typeInput === WorkdayOverrideType.SPECIAL_WORKDAY ? startTime : null,
      endTime: typeInput === WorkdayOverrideType.SPECIAL_WORKDAY ? endTime : null,
    },
    create: {
      date,
      type: typeInput,
      label,
      startTime: typeInput === WorkdayOverrideType.SPECIAL_WORKDAY ? startTime : null,
      endTime: typeInput === WorkdayOverrideType.SPECIAL_WORKDAY ? endTime : null,
      createdByUserId: user.id,
    },
  });

  refreshDashboardAndSettings();

  return {
    error: null,
    success:
      typeInput === WorkdayOverrideType.HOLIDAY
        ? `${label} berhasil disimpan sebagai hari libur.`
        : `${label} berhasil disimpan sebagai hari kerja khusus.`,
  };
}

export async function deleteWorkdayOverrideAction(
  _previousState: WorkdayOverrideState,
  formData: FormData,
): Promise<WorkdayOverrideState> {
  const user = await requireAuthenticatedUser();
  const ownerError = ensureOwnerSettingsAction(user);

  if (ownerError) {
    return ownerError;
  }

  const overrideId = String(formData.get("overrideId") ?? "").trim();

  if (!overrideId) {
    return {
      error: "Data override yang ingin dihapus belum valid.",
      success: null,
    };
  }

  await prisma.workdayOverride.delete({
    where: {
      id: overrideId,
    },
  });

  refreshDashboardAndSettings();

  return {
    error: null,
    success: "Override hari kerja/libur berhasil dihapus.",
  };
}

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireAuthenticatedUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      error: "Semua kolom password wajib diisi.",
      success: null,
    };
  }

  if (newPassword.length < 8) {
    return {
      error: "Password baru minimal 8 karakter.",
      success: null,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "Konfirmasi password baru belum sama.",
      success: null,
    };
  }

  if (currentPassword === newPassword) {
    return {
      error: "Password baru harus berbeda dari password saat ini.",
      success: null,
    };
  }

  const userWithPassword = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!verifyPassword(currentPassword, userWithPassword?.passwordHash)) {
    return {
      error: "Password saat ini belum sesuai.",
      success: null,
    };
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash: hashPassword(newPassword),
      authUserId: null,
    },
  });

  refreshSettings();

  return {
    error: null,
    success: "Password berhasil diperbarui.",
  };
}
