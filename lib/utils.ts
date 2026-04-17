import { AttendanceStatus, UserRole } from "@prisma/client";

const TWO_DIGIT_NUMBER = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function roundNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

export function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getMonthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month, 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

export function parseDateInput(value?: FormDataEntryValue | string | null) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatDateInput(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWorkdaySchedule(date = new Date()) {
  const day = date.getDay();

  if (day === 0) {
    return {
      isOff: true,
      label: "Minggu libur",
      start: "09:00",
      end: "00:00",
    };
  }

  if (day === 6) {
    return {
      isOff: false,
      label: "Sabtu 09:00-15:00",
      start: "09:00",
      end: "15:00",
    };
  }

  return {
    isOff: false,
    label: "Senin-Jumat 09:00-16:00",
    start: "09:00",
    end: "16:00",
  };
}

export function resolveAttendanceStatus(date: Date, checkIn?: Date | null) {
  const schedule = getWorkdaySchedule(date);

  if (schedule.isOff || !checkIn) {
    return AttendanceStatus.OFF;
  }

  const threshold = new Date(date);
  threshold.setHours(9, 0, 0, 0);

  return checkIn.getTime() > threshold.getTime()
    ? AttendanceStatus.LATE
    : AttendanceStatus.ONTIME;
}

export function calculateMonthlyKpi(scoreKinerja: number, scoreDisiplin: number) {
  return roundNumber(scoreKinerja * 0.7 + scoreDisiplin * 0.3);
}

export function calculateYearlyAverage(monthlyScores: number[]) {
  if (monthlyScores.length === 0) {
    return 0;
  }

  const total = monthlyScores.reduce((sum, value) => sum + value, 0);
  return roundNumber(total / 12);
}

export function calculateBonusPool(netProfit: number) {
  return roundNumber(netProfit * 0.1);
}

export function calculateIndividualBonus(input: {
  bonusPool: number;
  individualKpi: number;
  totalEligibleKpi: number;
}) {
  const { bonusPool, individualKpi, totalEligibleKpi } = input;

  if (individualKpi < 70 || totalEligibleKpi <= 0) {
    return 0;
  }

  let bonus = bonusPool * (individualKpi / totalEligibleKpi);

  if (individualKpi >= 95) {
    bonus *= 1.1;
  }

  return roundNumber(bonus);
}

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatScore(value?: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return TWO_DIGIT_NUMBER.format(value);
}

export function getRoleLabel(role: UserRole) {
  if (role === UserRole.OWNER) {
    return "Owner";
  }

  if (role === UserRole.ADMIN) {
    return "Admin";
  }

  return "Karyawan";
}

export function getKpiNarrative(monthlyScore?: number | null, yearlyScore?: number | null) {
  const score = yearlyScore ?? monthlyScore ?? 0;

  if (score >= 95) {
    return "Skor Anda sangat kuat. Pertahankan ritme yang sehat agar performa tinggi tetap berkelanjutan.";
  }

  if (score >= 80) {
    return "Performa terlihat solid. Fokus berikutnya adalah menjaga konsistensi disiplin dan penyelesaian pekerjaan.";
  }

  if (score >= 70) {
    return "Fondasi KPI sudah cukup baik. Area terbesar untuk naik kelas biasanya ada pada ketepatan hadir dan penutupan pekerjaan.";
  }

  if (score > 0) {
    return "Skor masih perlu diperkuat. Gunakan dashboard ini untuk melihat pola keterlambatan, progres, dan tindak lanjut revisi lebih cepat.";
  }

  return "Data KPI belum tersedia. Setelah absensi dan progres mulai terisi, ringkasan performa akan muncul di sini.";
}

export function compactYearMonths(values: Array<Date | null | undefined>) {
  const keys = new Set<string>();

  values.forEach((value) => {
    if (!value || Number.isNaN(value.getTime())) {
      return;
    }

    keys.add(`${value.getFullYear()}-${value.getMonth() + 1}`);
  });

  return Array.from(keys).map((key) => {
    const [year, month] = key.split("-").map(Number);
    return { year, month };
  });
}
