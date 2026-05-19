import { AttendanceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getJobWeight } from "@/lib/job-catalog";
import {
  calculateMonthlyKpi,
  calculateYearlyAverage,
  compactYearMonths,
  getAppDateParts,
  getAppTimeOnDate,
  isSunday,
  getMonthBounds,
  getMonthTimestampBounds,
  resolveAttendanceStatus,
  roundNumber,
} from "@/lib/utils";
import {
  buildWorkdayDateKey,
  getWorkdayOverrideMapForRange,
  resolveWorkdaySchedule,
  type WorkdayOverrideRow,
} from "@/lib/workday-overrides";

type AttendanceScoreRow = {
  date: Date;
  status: AttendanceStatus;
  checkIn: Date | null;
  checkOut: Date | null;
};

type ProgressScoreRow = {
  pekerjaan: string;
  createdAt: Date;
  targetSelesai: Date | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalRevisi: Date | null;
  revisiDone: Date | null;
  closing: boolean;
  isDone: boolean;
  canceledAt: Date | null;
};

const DISCIPLINE_CHECKIN_WEIGHT = 0.55;
const DISCIPLINE_CHECKOUT_WEIGHT = 0.45;

function getCheckInDisciplineScore(status: AttendanceStatus) {
  if (status === AttendanceStatus.ONTIME) {
    return 100;
  }

  if (status === AttendanceStatus.LATE) {
    return 70;
  }

  return 0;
}

function getCheckOutDisciplineScore(
  date: Date,
  checkOut: Date | null,
  schedule: ReturnType<typeof resolveWorkdaySchedule>,
) {
  if (!checkOut) {
    return null;
  }

  const [scheduleEndHour, scheduleEndMinute] = schedule.end.split(":").map(Number);
  const beforeNoonThreshold = getAppTimeOnDate(date, 12, 0, 0);
  const standardThreshold = getAppTimeOnDate(date, scheduleEndHour, scheduleEndMinute ?? 0, 0);
  const extendedThreshold = getAppTimeOnDate(date, scheduleEndHour + 1, scheduleEndMinute ?? 0, 0);

  if (checkOut.getTime() > extendedThreshold.getTime()) {
    return 100;
  }

  if (checkOut.getTime() > standardThreshold.getTime()) {
    return 85;
  }

  if (checkOut.getTime() < beforeNoonThreshold.getTime()) {
    return 35;
  }

  return 65;
}

function calculateAttendanceDayScore(
  row: AttendanceScoreRow,
  overrideMap: Map<string, WorkdayOverrideRow>,
) {
  const schedule = resolveWorkdaySchedule(
    row.date,
    overrideMap.get(buildWorkdayDateKey(row.date)),
  );
  const status =
    row.status === AttendanceStatus.OFF
      ? AttendanceStatus.OFF
      : resolveAttendanceStatus(row.date, row.checkIn, schedule);

  if (schedule.isOff && !row.checkIn) {
    return null;
  }

  if (
    status === AttendanceStatus.OFF &&
    (schedule.isOff || schedule.source === "override" || isSunday(row.date))
  ) {
    return null;
  }

  if (status === AttendanceStatus.OFF) {
    return 0;
  }

  const checkInScore = getCheckInDisciplineScore(status);
  const checkOutScore = getCheckOutDisciplineScore(row.date, row.checkOut, schedule);
  const weightedScore =
    checkOutScore === null
      ? checkInScore
      : checkInScore * DISCIPLINE_CHECKIN_WEIGHT + checkOutScore * DISCIPLINE_CHECKOUT_WEIGHT;

  return Math.min(100, roundNumber(weightedScore));
}

function calculateDisciplineScore(
  rows: AttendanceScoreRow[],
  overrideMap: Map<string, WorkdayOverrideRow>,
) {
  if (rows.length === 0) {
    return 0;
  }

  const summary = rows.reduce(
    (result, row) => {
      const score = calculateAttendanceDayScore(row, overrideMap);

      if (score === null) {
        return result;
      }

      return {
        total: result.total + score,
        countedDays: result.countedDays + 1,
      };
    },
    {
      total: 0,
      countedDays: 0,
    },
  );

  if (summary.countedDays === 0) {
    return 0;
  }

  return roundNumber(summary.total / summary.countedDays);
}

function getProgressBaseScore(row: ProgressScoreRow) {
  if (row.closing) {
    return 100;
  }

  if (row.isDone && row.revisiDone) {
    return 95;
  }

  if (row.isDone) {
    return 88;
  }

  if (row.tanggalSelesai && row.tanggalRevisi && !row.revisiDone) {
    return 68;
  }

  if (row.tanggalSelesai) {
    return 80;
  }

  if (row.tanggalMulai) {
    return 55;
  }

  return 35;
}

function getProgressCompletionDate(row: ProgressScoreRow) {
  if (row.revisiDone) {
    return row.revisiDone;
  }

  if (row.tanggalSelesai) {
    return row.tanggalSelesai;
  }

  return null;
}

function getProgressDeadlineAdjustedScore(row: ProgressScoreRow) {
  const baseScore = getProgressBaseScore(row);
  const completionDate = getProgressCompletionDate(row);

  if (!row.targetSelesai || !completionDate) {
    return baseScore;
  }

  const deadlineMs = row.targetSelesai.getTime();
  const completionMs = completionDate.getTime();

  if (completionMs < deadlineMs) {
    return Math.min(100, baseScore + 5);
  }

  if (completionMs === deadlineMs) {
    return baseScore;
  }

  const lateDays = Math.ceil((completionMs - deadlineMs) / (1000 * 60 * 60 * 24));

  if (lateDays <= 2) {
    return Math.max(0, baseScore - 10);
  }

  return Math.max(0, baseScore - 20);
}

function calculatePerformanceScore(rows: ProgressScoreRow[]) {
  const activeRows = rows.filter((row) => !row.canceledAt);

  if (activeRows.length === 0) {
    return 0;
  }

  const { totalScore, totalWeight } = activeRows.reduce(
    (summary, row) => {
      const weight = getJobWeight(row.pekerjaan);
      const score = getProgressDeadlineAdjustedScore(row);

      return {
        totalScore: summary.totalScore + score * weight,
        totalWeight: summary.totalWeight + weight,
      };
    },
    {
      totalScore: 0,
      totalWeight: 0,
    },
  );

  if (totalWeight === 0) {
    return 0;
  }

  return roundNumber(totalScore / totalWeight);
}

function buildProgressMonthWhere(userId: string, year: number, month: number): Prisma.DailyProgressWhereInput {
  const { start: dateStart, end: dateEnd } = getMonthBounds(year, month);
  const { start: timestampStart, end: timestampEnd } = getMonthTimestampBounds(year, month);

  return {
    userId,
    canceledAt: null,
    OR: [
      {
        createdAt: {
          gte: timestampStart,
          lt: timestampEnd,
        },
      },
      {
        targetSelesai: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      {
        tanggalMulai: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      {
        tanggalSelesai: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      {
        tanggalRevisi: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      {
        revisiDone: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
    ],
  };
}

export async function isKpiMonthLocked(year: number, month: number) {
  const existingLock = await prisma.kpiMonthLock.findUnique({
    where: {
      year_month: {
        year,
        month,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(existingLock);
}

export async function syncUserMonthlyKpi(userId: string, year: number, month: number) {
  if (await isKpiMonthLocked(year, month)) {
    return;
  }

  const { start, end } = getMonthBounds(year, month);

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lt: end,
      },
    },
    select: {
      date: true,
      status: true,
      checkIn: true,
      checkOut: true,
    },
  });

  const progressRows = await prisma.dailyProgress.findMany({
    where: buildProgressMonthWhere(userId, year, month),
    select: {
      pekerjaan: true,
      createdAt: true,
      targetSelesai: true,
      tanggalMulai: true,
      tanggalSelesai: true,
      tanggalRevisi: true,
      revisiDone: true,
      closing: true,
      isDone: true,
      canceledAt: true,
    },
  });

  const workdayOverrideMap = await getWorkdayOverrideMapForRange(start, end);
  const scoreDisiplin = calculateDisciplineScore(attendanceRows, workdayOverrideMap);
  const scoreKinerja = calculatePerformanceScore(progressRows);
  const totalScore = calculateMonthlyKpi(scoreKinerja, scoreDisiplin);

  await prisma.kpiMonthly.upsert({
    where: {
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
    update: {
      scoreKinerja,
      scoreDisiplin,
      totalScore,
    },
    create: {
      userId,
      year,
      month,
      scoreKinerja,
      scoreDisiplin,
      totalScore,
    },
  });

  await syncUserYearlyKpi(userId, year);
}

export async function syncUserYearlyKpi(userId: string, year: number) {
  const monthlyRows = await prisma.kpiMonthly.findMany({
    where: {
      userId,
      year,
    },
    select: {
      totalScore: true,
    },
  });

  const avgScore = calculateYearlyAverage(monthlyRows.map((row) => row.totalScore));

  await prisma.kpiYearly.upsert({
    where: {
      userId_year: {
        userId,
        year,
      },
    },
    update: {
      avgScore,
    },
    create: {
      userId,
      year,
      avgScore,
    },
  });
}

export async function syncUserKpisForDates(userId: string, dates: Array<Date | null | undefined>) {
  const yearMonths = compactYearMonths(dates);

  if (yearMonths.length === 0) {
    const { year, month } = getAppDateParts(new Date());
    await syncUserMonthlyKpi(userId, year, month);
    return;
  }

  await Promise.all(
    yearMonths.map(({ year, month }) => syncUserMonthlyKpi(userId, year, month)),
  );
}

export async function syncAllKpisForMonth(year: number, month: number) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
  });

  for (const user of users) {
    await syncUserMonthlyKpi(user.id, year, month);
  }
}
