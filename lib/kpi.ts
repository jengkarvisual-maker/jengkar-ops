import { AttendanceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyKpi,
  calculateYearlyAverage,
  compactYearMonths,
  getMonthBounds,
  getWorkdaySchedule,
  roundNumber,
} from "@/lib/utils";

type AttendanceScoreRow = {
  date: Date;
  status: AttendanceStatus;
};

type ProgressScoreRow = {
  createdAt: Date;
  targetSelesai: Date | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalRevisi: Date | null;
  revisiDone: Date | null;
  closing: boolean;
  isDone: boolean;
};

function calculateDisciplineScore(rows: AttendanceScoreRow[]) {
  if (rows.length === 0) {
    return 0;
  }

  const total = rows.reduce((sum, row) => {
    const schedule = getWorkdaySchedule(row.date);

    if (schedule.isOff) {
      return sum + 100;
    }

    if (row.status === AttendanceStatus.ONTIME) {
      return sum + 100;
    }

    if (row.status === AttendanceStatus.LATE) {
      return sum + 70;
    }

    return sum;
  }, 0);

  return roundNumber(total / rows.length);
}

function calculatePerformanceScore(rows: ProgressScoreRow[]) {
  if (rows.length === 0) {
    return 0;
  }

  const total = rows.reduce((sum, row) => {
    if (row.closing) {
      return sum + 100;
    }

    if (row.isDone && row.revisiDone) {
      return sum + 95;
    }

    if (row.isDone) {
      return sum + 88;
    }

    if (row.tanggalSelesai && row.tanggalRevisi && !row.revisiDone) {
      return sum + 68;
    }

    if (row.tanggalSelesai) {
      return sum + 80;
    }

    if (row.tanggalMulai) {
      return sum + 55;
    }

    return sum + 35;
  }, 0);

  return roundNumber(total / rows.length);
}

function buildProgressMonthWhere(userId: string, year: number, month: number): Prisma.DailyProgressWhereInput {
  const { start, end } = getMonthBounds(year, month);

  return {
    userId,
    OR: [
      {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      {
        targetSelesai: {
          gte: start,
          lt: end,
        },
      },
      {
        tanggalMulai: {
          gte: start,
          lt: end,
        },
      },
      {
        tanggalSelesai: {
          gte: start,
          lt: end,
        },
      },
      {
        tanggalRevisi: {
          gte: start,
          lt: end,
        },
      },
      {
        revisiDone: {
          gte: start,
          lt: end,
        },
      },
    ],
  };
}

export async function syncUserMonthlyKpi(userId: string, year: number, month: number) {
  const { start, end } = getMonthBounds(year, month);

  const [attendanceRows, progressRows] = await Promise.all([
    prisma.attendance.findMany({
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
      },
    }),
    prisma.dailyProgress.findMany({
      where: buildProgressMonthWhere(userId, year, month),
      select: {
        createdAt: true,
        targetSelesai: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        tanggalRevisi: true,
        revisiDone: true,
        closing: true,
        isDone: true,
      },
    }),
  ]);

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
    const now = new Date();
    await syncUserMonthlyKpi(userId, now.getFullYear(), now.getMonth() + 1);
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

  await Promise.all(users.map((user) => syncUserMonthlyKpi(user.id, year, month)));
}
