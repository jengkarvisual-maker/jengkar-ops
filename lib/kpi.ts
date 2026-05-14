import { AttendanceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getJobWeight } from "@/lib/job-catalog";
import {
  calculateMonthlyKpi,
  calculateYearlyAverage,
  compactYearMonths,
  getAppDateParts,
  isSunday,
  getMonthBounds,
  getMonthTimestampBounds,
  getWorkdaySchedule,
  resolveAttendanceStatus,
  roundNumber,
} from "@/lib/utils";

type AttendanceScoreRow = {
  date: Date;
  status: AttendanceStatus;
  checkIn: Date | null;
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

function calculateDisciplineScore(rows: AttendanceScoreRow[]) {
  if (rows.length === 0) {
    return 0;
  }

  const summary = rows.reduce(
    (result, row) => {
      const schedule = getWorkdaySchedule(row.date);
      const status =
        row.status === AttendanceStatus.OFF
          ? AttendanceStatus.OFF
          : resolveAttendanceStatus(row.date, row.checkIn);

      if (status === AttendanceStatus.OFF && isSunday(row.date)) {
        return result;
      }

      if (schedule.isOff) {
        return {
          total: result.total + 100,
          countedDays: result.countedDays + 1,
        };
      }

      if (status === AttendanceStatus.ONTIME) {
        return {
          total: result.total + 100,
          countedDays: result.countedDays + 1,
        };
      }

      if (status === AttendanceStatus.LATE) {
        return {
          total: result.total + 70,
          countedDays: result.countedDays + 1,
        };
      }

      return {
        total: result.total,
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

function isCompletedAfterTarget(row: ProgressScoreRow) {
  if (!row.targetSelesai || !row.tanggalSelesai) {
    return false;
  }

  return row.tanggalSelesai.getTime() > row.targetSelesai.getTime();
}

function calculatePerformanceScore(rows: ProgressScoreRow[]) {
  const activeRows = rows.filter((row) => !row.canceledAt && !isCompletedAfterTarget(row));

  if (activeRows.length === 0) {
    return 0;
  }

  const { totalScore, totalWeight } = activeRows.reduce(
    (summary, row) => {
      const weight = getJobWeight(row.pekerjaan);
      let score = 35;

      if (row.closing) {
        score = 100;
      } else if (row.isDone && row.revisiDone) {
        score = 95;
      } else if (row.isDone) {
        score = 88;
      } else if (row.tanggalSelesai && row.tanggalRevisi && !row.revisiDone) {
        score = 68;
      } else if (row.tanggalSelesai) {
        score = 80;
      } else if (row.tanggalMulai) {
        score = 55;
      }

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

  const scoreDisiplin = calculateDisciplineScore(attendanceRows);
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
