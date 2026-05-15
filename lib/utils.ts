import { AttendanceStatus, UserRole } from "@prisma/client";

export const APP_TIME_ZONE = "Asia/Jakarta";
const APP_UTC_OFFSET_HOURS = 7;

const TWO_DIGIT_NUMBER = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const APP_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getDatePartMap(date: Date) {
  return APP_DATE_PARTS_FORMATTER.formatToParts(date).reduce<Record<string, string>>((map, part) => {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }

    return map;
  }, {});
}

export function getAppDateParts(date = new Date()) {
  const parts = getDatePartMap(date);

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

function createAppCalendarDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function createAppTimestamp(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - APP_UTC_OFFSET_HOURS, minute, second, 0));
}

export function getAppTimeOnDate(date: Date, hour: number, minute = 0, second = 0) {
  const { year, month, day } = getAppDateParts(date);
  return createAppTimestamp(year, month, day, hour, minute, second);
}

export function roundNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

export function startOfDay(date = new Date()) {
  const { year, month, day } = getAppDateParts(date);
  return createAppCalendarDate(year, month, day);
}

export function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

export function startOfMonth(date = new Date()) {
  const { year, month } = getAppDateParts(date);
  return createAppCalendarDate(year, month, 1);
}

export function getMonthBounds(year: number, month: number) {
  const start = createAppCalendarDate(year, month, 1);
  const end = createAppCalendarDate(year, month + 1, 1);

  return { start, end };
}

export function getMonthTimestampBounds(year: number, month: number) {
  const start = createAppTimestamp(year, month, 1);
  const end = createAppTimestamp(year, month + 1, 1);

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

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = createAppCalendarDate(year, month, day);
  const resolved = getAppDateParts(date);

  if (
    Number.isNaN(date.getTime()) ||
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day
  ) {
    return null;
  }

  return date;
}

export function formatDateInput(value?: Date | string | null) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const { year, month, day } = getAppDateParts(date);

  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

export function getWorkdaySchedule(date = new Date()) {
  const { weekday } = getAppDateParts(date);

  if (weekday === "Sun") {
    return {
      isOff: false,
      label: "Minggu 09:00-16:00",
      start: "09:00",
      end: "16:00",
    };
  }

  if (weekday === "Sat") {
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

export function isSunday(date = new Date()) {
  return getAppDateParts(date).weekday === "Sun";
}

export function resolveAttendanceStatus(date: Date, checkIn?: Date | null) {
  const schedule = getWorkdaySchedule(date);

  if (schedule.isOff || !checkIn) {
    return AttendanceStatus.OFF;
  }

  const { year, month, day } = getAppDateParts(date);
  const threshold = createAppTimestamp(year, month, day, 9, 0, 0);

  return checkIn.getTime() > threshold.getTime()
    ? AttendanceStatus.LATE
    : AttendanceStatus.ONTIME;
}

export function calculateMonthlyKpi(scoreKinerja: number, scoreDisiplin: number) {
  return roundNumber(scoreKinerja * 0.9 + scoreDisiplin * 0.1);
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

  return roundNumber(bonusPool * (individualKpi / totalEligibleKpi));
}

export function formatDate(value?: Date | string | null) {
  const date = parseDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: Date | string | null) {
  const date = parseDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatTime(value?: Date | string | null) {
  const date = parseDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(createAppCalendarDate(year, month, 1));
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

export function formatHours(value?: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${TWO_DIGIT_NUMBER.format(value)} jam`;
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

    const { year, month } = getAppDateParts(value);
    keys.add(`${year}-${month}`);
  });

  return Array.from(keys).map((key) => {
    const [year, month] = key.split("-").map(Number);
    return { year, month };
  });
}
