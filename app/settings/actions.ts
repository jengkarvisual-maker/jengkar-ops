"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@prisma/client";

import {
  canResetManagedPasswords,
  canResetTargetUserPassword,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { env, isSupabaseConfigured } from "@/lib/env";
import { isKpiMonthLocked, syncAllKpisForMonth, syncUserKpisForDates } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export type ResetManagedPasswordState = {
  error: string | null;
  success: string | null;
};

export type LockKpiMonthState = {
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findSupabaseAuthUserIdByEmail(email: string) {
  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return {
      authUserId: null,
      client: null,
    };
  }

  let page = 1;
  let shouldContinue = true;

  while (shouldContinue) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const matchedUser = data.users.find((user) => user.email?.toLowerCase() === email);

    if (matchedUser) {
      return {
        authUserId: matchedUser.id,
        client: supabaseAdmin,
      };
    }

    shouldContinue = data.users.length === 200;
    page += 1;
  }

  return {
    authUserId: null,
    client: supabaseAdmin,
  };
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

  revalidatePath("/dashboard");
  revalidatePath("/settings");

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

  revalidatePath("/dashboard");
  revalidatePath("/settings");

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

  const existingProfile = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingProfile) {
    return {
      error: "Email ini sudah terdaftar di aplikasi OPS.",
      success: null,
    };
  }

  let authUserId: string | null = null;

  try {
    const { authUserId: existingAuthUserId, client: supabaseAdmin } =
      await findSupabaseAuthUserIdByEmail(email);

    if (!supabaseAdmin) {
      return {
        error:
          "Konfigurasi Supabase admin belum lengkap, jadi akun baru belum bisa dibuat dari dashboard owner.",
        success: null,
      };
    }

    if (existingAuthUserId) {
      return {
        error:
          "Email ini sudah terdaftar di sistem login. Gunakan email lain atau hubungi pengelola untuk sinkronisasi akun lama.",
        success: null,
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: UserRole.KARYAWAN,
      },
    });

    if (error || !data.user?.id) {
      return {
        error:
          error?.message || "Akun login belum berhasil dibuat. Silakan coba beberapa saat lagi.",
        success: null,
      };
    }

    authUserId = data.user.id;

    await prisma.user.create({
      data: {
        name,
        email,
        role: UserRole.KARYAWAN,
        authUserId,
      },
    });
  } catch (error) {
    if (authUserId) {
      const supabaseAdmin = createSupabaseAdminClient();
      await supabaseAdmin?.auth.admin.deleteUser(authUserId);
    }

    console.error("createEmployeeAction", error);

    return {
      error:
        "Akun baru belum berhasil disimpan. Jika percobaan pertama sempat membuat akun login, sistem sudah mencoba membersihkannya kembali.",
      success: null,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return {
    error: null,
    success: `${name} berhasil ditambahkan sebagai karyawan baru dan sudah bisa login dengan email ${email}.`,
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

  const targetUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      id: true,
      authUserId: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!targetUser) {
    return {
      error: "Akun tujuan tidak ditemukan.",
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

  const { authUserId: existingAuthUserId, client: supabaseAdmin } =
    await findSupabaseAuthUserIdByEmail(targetUser.email);

  if (!supabaseAdmin) {
    return {
      error:
        "Konfigurasi Supabase admin belum lengkap, jadi reset password belum bisa dijalankan.",
      success: null,
    };
  }

  const authUserId = targetUser.authUserId ?? existingAuthUserId;

  if (!authUserId) {
    return {
      error:
        "Akun login Supabase untuk user ini belum ditemukan. Silakan pastikan akun tersebut pernah dibuat atau login setidaknya sekali.",
      success: null,
    };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: newPassword,
  });

  if (error) {
    return {
      error: error.message || "Reset password belum berhasil. Silakan coba lagi.",
      success: null,
    };
  }

  if (!targetUser.authUserId && existingAuthUserId) {
    await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        authUserId: existingAuthUserId,
      },
    });
  }

  revalidatePath("/settings");

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

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return {
    error: null,
    success: `KPI ${formatMonthYear(parsedMonth.month, parsedMonth.year)} berhasil dikunci. Perubahan absensi atau progres lama setelah ini tidak akan menggeser hasil evaluasi periode tersebut.`,
  };
}

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireAuthenticatedUser();

  if (!isSupabaseConfigured()) {
    return {
      error: "Konfigurasi Supabase belum lengkap. Password belum bisa diperbarui.",
      success: null,
    };
  }

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

  const verifier = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return {
      error: "Password saat ini belum sesuai.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Sesi auth tidak tersedia. Silakan login ulang lalu coba lagi.",
      success: null,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return {
      error: "Password belum berhasil diperbarui. Silakan coba beberapa saat lagi.",
      success: null,
    };
  }

  revalidatePath("/settings");

  return {
    error: null,
    success: "Password berhasil diperbarui.",
  };
}
