"use server";

import { AttendanceStatus, StopCardStatus, UserRole } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { canManageFinance, canManageProgress, requireAuthenticatedUser } from "@/lib/auth";
import { isKnownJobName } from "@/lib/job-catalog";
import { syncAllKpisForMonth, syncUserKpisForDates } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";
import {
  calculateBonusPool,
  getAppDateParts,
  getWorkdaySchedule,
  parseDateInput,
  resolveAttendanceStatus,
  startOfDay,
} from "@/lib/utils";

type FeedbackType = "success" | "error";
const OPS_DASHBOARD_TAG = "ops-dashboard";

export type HideCompletedProgressResult =
  | {
      ok: true;
      progressId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type HideAllCompletedProgressResult =
  | {
      ok: true;
      count: number;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type ManagerProgressMutationRow = {
  id: string;
  pekerjaan: string;
  detail: string | null;
  userId: string;
  name: string;
  targetSelesai: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  tanggalRevisi: string | null;
  revisiDone: string | null;
  closing: boolean;
  isDone: boolean;
  canceledAt: string | null;
  createdAt: string;
};

export type UpdateManagerProgressInlineResult =
  | {
      ok: true;
      row: ManagerProgressMutationRow;
      movedToCompleted: boolean;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type CloseProgressInlineResult =
  | {
      ok: true;
      row: ManagerProgressMutationRow;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function refreshDashboard() {
  revalidateTag(OPS_DASHBOARD_TAG, "max");
  revalidatePath("/dashboard");
}

function toIsoDateValue(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

function serializeManagerProgressRow(row: {
  id: string;
  pekerjaan: string;
  detail: string | null;
  userId: string;
  targetSelesai: Date | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalRevisi: Date | null;
  revisiDone: Date | null;
  closing: boolean;
  isDone: boolean;
  canceledAt: Date | null;
  createdAt: Date;
  user: {
    name: string;
  };
}): ManagerProgressMutationRow {
  return {
    id: row.id,
    pekerjaan: row.pekerjaan,
    detail: row.detail,
    userId: row.userId,
    name: row.user.name,
    targetSelesai: toIsoDateValue(row.targetSelesai),
    tanggalMulai: toIsoDateValue(row.tanggalMulai),
    tanggalSelesai: toIsoDateValue(row.tanggalSelesai),
    tanggalRevisi: toIsoDateValue(row.tanggalRevisi),
    revisiDone: toIsoDateValue(row.revisiDone),
    closing: row.closing,
    isDone: row.isDone,
    canceledAt: toIsoDateValue(row.canceledAt),
    createdAt: toIsoDateValue(row.createdAt) ?? new Date().toISOString(),
  };
}

function redirectWithFeedback(type: FeedbackType, message: string): never {
  const params = new URLSearchParams({
    feedbackType: type,
    feedbackMessage: message,
    feedbackAt: Date.now().toString(),
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

function parseJobName(value: FormDataEntryValue | null) {
  const pekerjaan = parseRequiredString(value, "Pekerjaan");

  if (!isKnownJobName(pekerjaan)) {
    redirectWithFeedback("error", "Pilih pekerjaan dari daftar yang tersedia.");
  }

  return pekerjaan;
}

function parseOptionalText(value: FormDataEntryValue | null, fieldLabel: string) {
  const normalized = String(value ?? "").trim();

  if (normalized.length > 1000) {
    redirectWithFeedback("error", `${fieldLabel} maksimal 1000 karakter.`);
  }

  return normalized || null;
}

function parseBoundedRequiredString(
  value: FormDataEntryValue | null,
  fieldLabel: string,
  maxLength: number,
) {
  const normalized = parseRequiredString(value, fieldLabel);

  if (normalized.length > maxLength) {
    redirectWithFeedback("error", `${fieldLabel} maksimal ${maxLength} karakter.`);
  }

  return normalized;
}

function parseStopCardStatus(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();

  if (!Object.values(StopCardStatus).includes(normalized as StopCardStatus)) {
    redirectWithFeedback("error", "Status STOP CARD belum valid.");
  }

  return normalized as StopCardStatus;
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
  refreshDashboard();
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
  refreshDashboard();
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
  refreshDashboard();
  redirectWithFeedback("success", "Status OFF berhasil dicatat.");
}

export async function submitStopCardAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.KARYAWAN) {
    redirectWithFeedback("error", "STOP CARD hanya tersedia untuk akun karyawan.");
  }

  const title = parseBoundedRequiredString(formData.get("title"), "Judul STOP CARD", 120);
  const content = parseBoundedRequiredString(formData.get("content"), "Isi STOP CARD", 3000);

  await prisma.stopCard.create({
    data: {
      userId: user.id,
      title,
      content,
      status: StopCardStatus.BARU,
    },
  });

  refreshDashboard();
  redirectWithFeedback(
    "success",
    "STOP CARD berhasil dikirim. Owner akan melihat isi laporan ini tanpa identitas pengirim.",
  );
}

export async function updateStopCardStatusAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.OWNER) {
    redirectWithFeedback("error", "Hanya Owner yang bisa memperbarui status STOP CARD.");
  }

  const stopCardId = parseRequiredString(formData.get("stopCardId"), "ID STOP CARD");
  const status = parseStopCardStatus(formData.get("status"));

  const existing = await prisma.stopCard.findUnique({
    where: {
      id: stopCardId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    redirectWithFeedback("error", "STOP CARD tidak ditemukan.");
  }

  await prisma.stopCard.update({
    where: {
      id: stopCardId,
    },
    data: {
      status,
    },
  });

  refreshDashboard();
  redirectWithFeedback("success", "Status STOP CARD berhasil diperbarui.");
}

export async function createProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Hanya Owner atau Admin yang bisa membuat progres baru.");
  }

  const pekerjaan = parseJobName(formData.get("pekerjaan"));
  const detail = parseOptionalText(formData.get("detail"), "Detail pekerjaan");
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
      detail,
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
  refreshDashboard();
  redirectWithFeedback("success", "Progres baru berhasil ditambahkan.");
}

export async function updateManagerProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Anda tidak memiliki izin untuk mengubah progres ini.");
  }

  const progressId = parseRequiredString(formData.get("progressId"), "ID progres");
  const pekerjaan = parseJobName(formData.get("pekerjaan"));
  const detail = parseOptionalText(formData.get("detail"), "Detail pekerjaan");
  const userId = parseRequiredString(formData.get("userId"), "Nama karyawan");

  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: progressId,
    },
  });

  if (!progress) {
    redirectWithFeedback("error", "Baris progres tidak ditemukan.");
  }

  if (progress.canceledAt) {
    redirectWithFeedback("error", "Pekerjaan yang sudah dibatalkan tidak bisa diubah.");
  }

  await ensureAssignableUser(userId);

  const submittedTargetSelesai = parseDateInput(formData.get("targetSelesai"));
  const targetSelesai = progress.targetSelesai ?? submittedTargetSelesai;
  const tanggalMulai = parseDateInput(formData.get("tanggalMulai"));
  const submittedTanggalSelesai = parseDateInput(formData.get("tanggalSelesai"));
  const tanggalRevisi = parseDateInput(formData.get("tanggalRevisi"));
  const revisiDone = parseDateInput(formData.get("revisiDone"));
  const isDone = formData.get("isDone") === "on";
  const closing = formData.get("closing") === "on";
  const tanggalSelesai = closing
    ? submittedTanggalSelesai ?? startOfDay(new Date())
    : submittedTanggalSelesai;

  const resolvedIsDone = closing || isDone || Boolean(tanggalSelesai || revisiDone);

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      pekerjaan,
      detail,
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
  refreshDashboard();
  redirectWithFeedback("success", "Progres berhasil diperbarui.");
}

export async function updateManagerProgressInlineAction(
  formData: FormData,
): Promise<UpdateManagerProgressInlineResult> {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    return {
      ok: false,
      message: "Anda tidak memiliki izin untuk mengubah progres ini.",
    };
  }

  const progressId = String(formData.get("progressId") ?? "").trim();
  const pekerjaan = String(formData.get("pekerjaan") ?? "").trim();
  const detailRaw = String(formData.get("detail") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!progressId || !pekerjaan || !userId) {
    return {
      ok: false,
      message: "Data progres wajib diisi lengkap.",
    };
  }

  if (!isKnownJobName(pekerjaan)) {
    return {
      ok: false,
      message: "Pilih pekerjaan dari daftar yang tersedia.",
    };
  }

  if (detailRaw.length > 1000) {
    return {
      ok: false,
      message: "Detail pekerjaan maksimal 1000 karakter.",
    };
  }

  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: progressId,
    },
  });

  if (!progress) {
    return {
      ok: false,
      message: "Baris progres tidak ditemukan.",
    };
  }

  if (progress.canceledAt) {
    return {
      ok: false,
      message: "Pekerjaan yang sudah dibatalkan tidak bisa diubah.",
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser || targetUser.role !== UserRole.KARYAWAN) {
    return {
      ok: false,
      message: "Karyawan tujuan tidak ditemukan.",
    };
  }

  const submittedTargetSelesai = parseDateInput(formData.get("targetSelesai"));
  const targetSelesai = progress.targetSelesai ?? submittedTargetSelesai;
  const tanggalMulai = parseDateInput(formData.get("tanggalMulai"));
  const submittedTanggalSelesai = parseDateInput(formData.get("tanggalSelesai"));
  const tanggalRevisi = parseDateInput(formData.get("tanggalRevisi"));
  const revisiDone = parseDateInput(formData.get("revisiDone"));
  const isDone = formData.get("isDone") === "on";
  const closing = formData.get("closing") === "on";
  const tanggalSelesai = closing
    ? submittedTanggalSelesai ?? startOfDay(new Date())
    : submittedTanggalSelesai;
  const resolvedIsDone = closing || isDone || Boolean(tanggalSelesai || revisiDone);

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      pekerjaan,
      detail: detailRaw || null,
      userId,
      targetSelesai,
      tanggalMulai,
      tanggalSelesai,
      tanggalRevisi,
      revisiDone,
      isDone: resolvedIsDone,
      closing,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
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
  refreshDashboard();

  return {
    ok: true,
    row: serializeManagerProgressRow(updated),
    movedToCompleted: updated.closing,
    message: updated.closing
      ? "Pekerjaan langsung dipindahkan ke completed recap."
      : "Perubahan progres berhasil disimpan.",
  };
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

  if (progress.canceledAt) {
    redirectWithFeedback("error", "Pekerjaan yang sudah dibatalkan tidak bisa di-closing.");
  }

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      closing: true,
      isDone: true,
      tanggalSelesai: progress.tanggalSelesai ?? startOfDay(new Date()),
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
  refreshDashboard();
  redirectWithFeedback("success", "Progres berhasil dipindahkan ke daftar completed.");
}

export async function closeProgressInlineAction(
  progressId: string,
): Promise<CloseProgressInlineResult> {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    return {
      ok: false,
      message: "Anda tidak memiliki izin untuk menutup progres.",
    };
  }

  const normalizedProgressId = progressId.trim();

  if (!normalizedProgressId) {
    return {
      ok: false,
      message: "ID progres wajib diisi.",
    };
  }

  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: normalizedProgressId,
    },
  });

  if (!progress) {
    return {
      ok: false,
      message: "Baris progres tidak ditemukan.",
    };
  }

  if (progress.canceledAt) {
    return {
      ok: false,
      message: "Pekerjaan yang sudah dibatalkan tidak bisa di-closing.",
    };
  }

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      closing: true,
      isDone: true,
      tanggalSelesai: progress.tanggalSelesai ?? startOfDay(new Date()),
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
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
  refreshDashboard();

  return {
    ok: true,
    row: serializeManagerProgressRow(updated),
    message: "Pekerjaan berhasil dipindahkan ke daftar completed.",
  };
}

export async function cancelProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Anda tidak memiliki izin untuk membatalkan progres.");
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

  if (progress.closing) {
    redirectWithFeedback("error", "Pekerjaan yang sudah closing tidak bisa dibatalkan.");
  }

  if (progress.canceledAt) {
    redirectWithFeedback("error", "Pekerjaan ini sudah dibatalkan.");
  }

  const updated = await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      canceledAt: new Date(),
      closing: false,
      isDone: false,
    },
  });

  await syncUserKpisForDates(updated.userId, [
    progress.createdAt,
    progress.targetSelesai,
    progress.tanggalMulai,
    progress.tanggalSelesai,
    progress.tanggalRevisi,
    progress.revisiDone,
    updated.canceledAt,
  ]);
  refreshDashboard();
  redirectWithFeedback(
    "success",
    "Pekerjaan berhasil dibatalkan dan tidak ikut masuk penilaian KPI.",
  );
}

export async function deleteCompletedProgressAction(formData: FormData) {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.OWNER) {
    redirectWithFeedback("error", "Hanya Owner yang bisa menghapus pekerjaan yang sudah closing.");
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

  if (!progress.closing) {
    redirectWithFeedback("error", "Hanya pekerjaan yang sudah closing yang bisa dihapus dari recap.");
  }

  if (progress.hiddenFromDashboard) {
    redirectWithFeedback("error", "Pekerjaan ini sudah disembunyikan dari dashboard.");
  }

  await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      hiddenFromDashboard: true,
    },
  });

  refreshDashboard();
  redirectWithFeedback(
    "success",
    "Pekerjaan berhasil disembunyikan dari dashboard tanpa menghapus nilai KPI yang sudah terbentuk.",
  );
}

export async function hideCompletedProgressFromDashboardAction(
  progressId: string,
): Promise<HideCompletedProgressResult> {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.OWNER) {
    return {
      ok: false,
      message: "Hanya Owner yang bisa menghapus pekerjaan yang sudah closing.",
    };
  }

  const normalizedProgressId = progressId.trim();

  if (!normalizedProgressId) {
    return {
      ok: false,
      message: "ID progres wajib diisi.",
    };
  }

  const progress = await prisma.dailyProgress.findUnique({
    where: {
      id: normalizedProgressId,
    },
    select: {
      id: true,
      closing: true,
      hiddenFromDashboard: true,
    },
  });

  if (!progress) {
    return {
      ok: false,
      message: "Baris progres tidak ditemukan.",
    };
  }

  if (!progress.closing) {
    return {
      ok: false,
      message: "Hanya pekerjaan yang sudah closing yang bisa dihapus dari recap.",
    };
  }

  if (progress.hiddenFromDashboard) {
    return {
      ok: false,
      message: "Pekerjaan ini sudah disembunyikan dari dashboard.",
    };
  }

  await prisma.dailyProgress.update({
    where: {
      id: progress.id,
    },
    data: {
      hiddenFromDashboard: true,
    },
  });

  refreshDashboard();

  return {
    ok: true,
    progressId: progress.id,
    message: "Pekerjaan berhasil disembunyikan dari dashboard.",
  };
}

export async function deleteAllCompletedProgressAction() {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.OWNER) {
    redirectWithFeedback(
      "error",
      "Hanya Owner yang bisa menyembunyikan seluruh completed work recap.",
    );
  }

  const result = await prisma.dailyProgress.updateMany({
    where: {
      closing: true,
      hiddenFromDashboard: false,
      canceledAt: null,
    },
    data: {
      hiddenFromDashboard: true,
    },
  });

  refreshDashboard();
  redirectWithFeedback(
    "success",
    result.count > 0
      ? `${result.count} item completed work recap berhasil disembunyikan dari dashboard tanpa mengubah nilai KPI.`
      : "Tidak ada completed work recap aktif yang perlu disembunyikan.",
  );
}

export async function hideAllCompletedProgressFromDashboardAction(): Promise<HideAllCompletedProgressResult> {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.OWNER) {
    return {
      ok: false,
      message: "Hanya Owner yang bisa menyembunyikan seluruh completed work recap.",
    };
  }

  const result = await prisma.dailyProgress.updateMany({
    where: {
      closing: true,
      hiddenFromDashboard: false,
      canceledAt: null,
    },
    data: {
      hiddenFromDashboard: true,
    },
  });

  refreshDashboard();

  return {
    ok: true,
    count: result.count,
    message:
      result.count > 0
        ? `${result.count} item completed work recap berhasil disembunyikan dari dashboard.`
        : "Tidak ada completed work recap aktif yang perlu disembunyikan.",
  };
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

  if (progress.canceledAt) {
    redirectWithFeedback("error", "Pekerjaan yang sudah dibatalkan tidak bisa diubah.");
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
  refreshDashboard();
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

  refreshDashboard();
  redirectWithFeedback("success", "Data finance tahunan berhasil diperbarui.");
}

export async function syncCurrentMonthKpiAction() {
  const user = await requireAuthenticatedUser();

  if (!canManageProgress(user.role)) {
    redirectWithFeedback("error", "Anda tidak memiliki izin untuk menyinkronkan KPI.");
  }

  const { year, month } = getAppDateParts(new Date());
  await syncAllKpisForMonth(year, month);
  refreshDashboard();
  redirectWithFeedback("success", "Sinkron KPI bulan berjalan selesai dijalankan.");
}
