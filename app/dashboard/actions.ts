"use server";

import { AttendanceStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageFinance, canManageProgress, requireAuthenticatedUser } from "@/lib/auth";
import { syncAllKpisForMonth, syncUserKpisForDates } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";
import {
  calculateBonusPool,
  getWorkdaySchedule,
  parseDateInput,
  resolveAttendanceStatus,
  startOfDay,
} from "@/lib/utils";

type FeedbackType = "success" | "error";

function redirectWithFeedback(type: FeedbackType, message: string): never {
  const params = new URLSearchParams({
    feedbackType: type,
    feedbackMessage: message,
  });

  redirect(`/dashboard?${params.toString()}`);
}

function parseRequiredString(value: FormDataEntryValue | null, fieldLabel: string) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    redirectWithFeedback("error", `${fieldLabel} wajib diisi.`);
  }

  return normalized;
}

function parsePositiveNumber(value: FormDataEntryValue | null, fieldLabel: string) {
  const normalized = String(value ?? "").trim();
  const parsed = Number(normalized);

  if (!normalized || Number.isNaN(parsed) || parsed < 0) {
    redirectWithFeedback("error", `${fieldLabel} harus berupa angka valid.`);
  }

  return parsed;
}

function parseYear(value: FormDataEntryValue | null) {
  const year = parsePositiveNumber(value, "Tahun");

  if (year < 2000 || year > 2100) {
    redirectWithFeedback("error", "Tahun harus berada dalam rentang yang masuk akal.");
  }

  return year;
}

async function ensureAssignableUser(userId: string) {
  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      name: true,
    },
  });

  if (!targetUser || targetUser.role !== UserRole.KARYAWAN) {
    redirectWithFeedback("error", "Karyawan tujuan tidak ditemukan.");
  }

  return targetUser;
}

export async function checkInAction() {
  const user = await requireAuthenticatedUser();
  const now = new Date();
  const today = startOfDay(now);
  const schedule = getWorkdaySchedule(now);

  if (schedule.isOff) {
    redirectWithFeedback(
      "error",
      "Hari ini terdeteksi sebagai hari libur. Gunakan tombol OFF bila perlu mencatat status.",
    );
  }

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
  });

  if (existing?.checkIn) {
    redirectWithFeedback("error", "Check-in hari ini sudah tercatat.");
  }

  await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    update: {
      checkIn: now,
      checkOut: null,
      status: resolveAttendanceStatus(now, now),
    },
    create: {
      userId: user.id,
      date: today,
      checkIn: now,
      checkOut: null,
      status: resolveAttendanceStatus(now, now),
    },
  });

  await syncUserKpisForDates(user.id, [now]);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Check-in berhasil dicatat.");
}

export async function checkOutAction() {
  const user = await requireAuthenticatedUser();
  const now = new Date();
  const today = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
  });

  if (!existing?.checkIn) {
    redirectWithFeedback("error", "Anda belum check-in hari ini.");
  }

  if (existing.checkOut) {
    redirectWithFeedback("error", "Check-out hari ini sudah tercatat.");
  }

  await prisma.attendance.update({
    where: {
      id: existing.id,
    },
    data: {
      checkOut: now,
    },
  });

  await syncUserKpisForDates(user.id, [now]);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Check-out berhasil dicatat.");
}

export async function markOffAction() {
  const user = await requireAuthenticatedUser();
  const now = new Date();
  const today = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
  });

  if (existing?.checkIn) {
    redirectWithFeedback(
      "error",
      "Status OFF tidak bisa dipakai karena absensi hari ini sudah dimulai.",
    );
  }

  await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    update: {
      status: AttendanceStatus.OFF,
      checkIn: null,
      checkOut: null,
    },
    create: {
      userId: user.id,
      date: today,
      status: AttendanceStatus.OFF,
      checkIn: null,
      checkOut: null,
    },
  });

  await syncUserKpisForDates(user.id, [now]);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Status OFF berhasil dicatat.");
}

export async function createProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Hanya Owner atau Admin yang bisa membuat progres baru.");
  }

  const pekerjaan = parseRequiredString(formData.get("pekerjaan"), "Pekerjaan");
  const userId = parseRequiredString(formData.get("userId"), "Nama karyawan");
  const targetSelesai = parseDateInput(formData.get("targetSelesai"));
  const tanggalMulai = parseDateInput(formData.get("tanggalMulai"));

  if (!targetSelesai || !tanggalMulai) {
    redirectWithFeedback("error", "Tanggal mulai dan target selesai wajib diisi.");
  }

  await ensureAssignableUser(userId);

  const progress = await prisma.dailyProgress.create({
    data: {
      pekerjaan,
      userId,
      targetSelesai,
      tanggalMulai,
      isDone: false,
      closing: false,
    },
  });

  await syncUserKpisForDates(userId, [
    progress.createdAt,
    progress.targetSelesai,
    progress.tanggalMulai,
  ]);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Progres baru berhasil ditambahkan.");
}

export async function updateManagerProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Anda tidak memiliki izin untuk mengubah progres ini.");
  }

  const progressId = parseRequiredString(formData.get("progressId"), "ID progres");
  const pekerjaan = parseRequiredString(formData.get("pekerjaan"), "Pekerjaan");
  const userId = parseRequiredString(formData.get("userId"), "Nama karyawan");

  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: progressId,
    },
  });

  if (!progress) {
    redirectWithFeedback("error", "Baris progres tidak ditemukan.");
  }

  await ensureAssignableUser(userId);

  const targetSelesai = parseDateInput(formData.get("targetSelesai"));
  const tanggalMulai = parseDateInput(formData.get("tanggalMulai"));
  const tanggalSelesai = parseDateInput(formData.get("tanggalSelesai"));
  const tanggalRevisi = parseDateInput(formData.get("tanggalRevisi"));
  const revisiDone = parseDateInput(formData.get("revisiDone"));
  const isDone = formData.get("isDone") === "on";
  const closing = formData.get("closing") === "on";

  const resolvedIsDone = closing || isDone || Boolean(tanggalSelesai || revisiDone);

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      pekerjaan,
      userId,
      targetSelesai,
      tanggalMulai,
      tanggalSelesai,
      tanggalRevisi,
      revisiDone,
      isDone: resolvedIsDone,
      closing,
    },
  });

  const affectedDates = [
    progress.createdAt,
    progress.targetSelesai,
    progress.tanggalMulai,
    progress.tanggalSelesai,
    progress.tanggalRevisi,
    progress.revisiDone,
    updated.createdAt,
    updated.targetSelesai,
    updated.tanggalMulai,
    updated.tanggalSelesai,
    updated.tanggalRevisi,
    updated.revisiDone,
  ];

  if (progress.userId !== updated.userId) {
    await syncUserKpisForDates(progress.userId, affectedDates);
  }

  await syncUserKpisForDates(updated.userId, affectedDates);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Progres berhasil diperbarui.");
}

export async function closeProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Anda tidak memiliki izin untuk menutup progres.");
  }

  const progressId = parseRequiredString(formData.get("progressId"), "ID progres");
  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: progressId,
    },
  });

  if (!progress) {
    redirectWithFeedback("error", "Baris progres tidak ditemukan.");
  }

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      closing: true,
      isDone: true,
      tanggalSelesai: progress.tanggalSelesai ?? new Date(),
    },
  });

  await syncUserKpisForDates(updated.userId, [
    progress.createdAt,
    progress.targetSelesai,
    progress.tanggalMulai,
    progress.tanggalSelesai,
    progress.tanggalRevisi,
    progress.revisiDone,
    updated.tanggalSelesai,
  ]);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Progres berhasil dipindahkan ke daftar completed.");
}

export async function updateEmployeeProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const progressId = parseRequiredString(formData.get("progressId"), "ID progres");

  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: progressId,
    },
  });

  if (!progress || progress.userId !== user.id) {
    redirectWithFeedback("error", "Anda hanya bisa memperbarui progres milik Anda sendiri.");
  }

  const tanggalSelesai = parseDateInput(formData.get("tanggalSelesai"));
  const revisiDone = parseDateInput(formData.get("revisiDone"));

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      tanggalSelesai,
      revisiDone,
      isDone: Boolean(progress.isDone || tanggalSelesai || revisiDone),
    },
  });

  await syncUserKpisForDates(user.id, [
    progress.createdAt,
    progress.targetSelesai,
    progress.tanggalMulai,
    progress.tanggalSelesai,
    progress.tanggalRevisi,
    progress.revisiDone,
    updated.tanggalSelesai,
    updated.revisiDone,
  ]);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Update progres pribadi berhasil disimpan.");
}

export async function saveFinanceAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageFinance(user.role)) {
    redirectWithFeedback("error", "Hanya Owner yang bisa mengubah data finance.");
  }

  const year = parseYear(formData.get("year"));
  const netProfit = parsePositiveNumber(formData.get("netProfit"), "Net profit");
  const bonusPool = calculateBonusPool(netProfit);

  await prisma.companyFinance.upsert({
    where: {
      year,
    },
    update: {
      netProfit,
      bonusPool,
    },
    create: {
      year,
      netProfit,
      bonusPool,
    },
  });

  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Data finance tahunan berhasil diperbarui.");
}

export async function syncCurrentMonthKpiAction() {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Anda tidak memiliki izin untuk menyinkronkan KPI.");
  }

  const now = new Date();
  await syncAllKpisForMonth(now.getFullYear(), now.getMonth() + 1);
  revalidatePath("/dashboard");
  redirectWithFeedback("success", "Sinkron KPI bulan berjalan selesai dijalankan.");
}
