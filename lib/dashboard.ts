import { AttendanceStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  addDays,
  calculateIndividualBonus,
  formatMonthYear,
  getWorkdaySchedule,
  getKpiNarrative,
  startOfDay,
} from "@/lib/utils";
import type {
  AdminDashboardData,
  AttendanceItem,
  EmployeeDashboardData,
  MonthlyKpiItem,
  OwnerDashboardData,
  ProgressItem,
  YearlyKpiItem,
} from "@/types/dashboard";

function mapAttendanceRows(
  rows: Array<{
    id: string;
    userId: string;
    date: Date;
    status: AttendanceStatus;
    checkIn: Date | null;
    checkOut: Date | null;
    user: {
      name: string;
      email: string;
    };
  }>,
): AttendanceItem[] {
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    date: row.date,
    status: row.status,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
  }));
}

function mapProgressRows(
  rows: Array<{
    id: string;
    pekerjaan: string;
    userId: string;
    targetSelesai: Date | null;
    tanggalMulai: Date | null;
    tanggalSelesai: Date | null;
    tanggalRevisi: Date | null;
    revisiDone: Date | null;
    closing: boolean;
    isDone: boolean;
    createdAt: Date;
    user: {
      name: string;
    };
  }>,
): ProgressItem[] {
  return rows.map((row) => ({
    id: row.id,
    pekerjaan: row.pekerjaan,
    userId: row.userId,
    name: row.user.name,
    targetSelesai: row.targetSelesai,
    tanggalMulai: row.tanggalMulai,
    tanggalSelesai: row.tanggalSelesai,
    tanggalRevisi: row.tanggalRevisi,
    revisiDone: row.revisiDone,
    closing: row.closing,
    isDone: row.isDone,
    createdAt: row.createdAt,
  }));
}

function mapMonthlyKpis(
  rows: Array<{
    id: string;
    userId: string;
    month: number;
    year: number;
    scoreKinerja: number;
    scoreDisiplin: number;
    totalScore: number;
    user: {
      name: string;
    };
  }>,
): MonthlyKpiItem[] {
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    month: row.month,
    year: row.year,
    scoreKinerja: row.scoreKinerja,
    scoreDisiplin: row.scoreDisiplin,
    totalScore: row.totalScore,
  }));
}

function mapYearlyKpis(
  rows: Array<{
    id: string;
    userId: string;
    year: number;
    avgScore: number;
    user: {
      name: string;
    };
  }>,
): YearlyKpiItem[] {
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    year: row.year,
    avgScore: row.avgScore,
  }));
}

function summarizeAttendance(attendanceRows: AttendanceItem[]) {
  return attendanceRows.reduce(
    (summary, row) => {
      if (row.status === AttendanceStatus.ONTIME) {
        summary.onTime += 1;
      } else if (row.status === AttendanceStatus.LATE) {
        summary.late += 1;
      } else {
        summary.off += 1;
      }

      return summary;
    },
    {
      onTime: 0,
      late: 0,
      off: 0,
    },
  );
}

async function getAssignableUsers() {
  return prisma.user.findMany({
    where: {
      role: UserRole.KARYAWAN,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function getOwnerDashboardData(): Promise<OwnerDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [
    users,
    teamUsers,
    attendanceRows,
    progressRows,
    completedProgressRows,
    completedProgressCount,
    openProgressCount,
    monthlyRows,
    yearlyRows,
    finance,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    getAssignableUsers(),
    prisma.attendance.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.dailyProgress.findMany({
      where: {
        closing: false,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
    prisma.dailyProgress.findMany({
      where: {
        closing: true,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 6,
    }),
    prisma.dailyProgress.count({
      where: {
        closing: true,
      },
    }),
    prisma.dailyProgress.count({
      where: {
        closing: false,
      },
    }),
    prisma.kpiMonthly.findMany({
      where: {
        year: currentYear,
        month: currentMonth,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        totalScore: "desc",
      },
      take: 12,
    }),
    prisma.kpiYearly.findMany({
      where: {
        year: currentYear,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        avgScore: "desc",
      },
      take: 12,
    }),
    prisma.companyFinance.findFirst({
      orderBy: {
        year: "desc",
      },
    }),
  ]);

  const attendanceToday = mapAttendanceRows(attendanceRows);
  const monthlyKpis = mapMonthlyKpis(monthlyRows);
  const yearlyKpis = mapYearlyKpis(yearlyRows);
  const bonusPool = finance?.bonusPool ?? 0;
  const eligibleKpis = yearlyKpis.filter((row) => row.avgScore >= 70);
  const totalEligibleKpi = eligibleKpis.reduce((sum, row) => sum + row.avgScore, 0);

  return {
    teamSize: users.length,
    teamUsers,
    attendanceToday,
    attendanceSummary: summarizeAttendance(attendanceToday),
    recentProgress: mapProgressRows(progressRows),
    completedProgressRows: mapProgressRows(completedProgressRows),
    completedProgressCount,
    openProgressCount,
    monthlyKpis,
    yearlyKpis,
    bonusPreview: eligibleKpis
      .map((row) => ({
        userId: row.userId,
        name: row.name,
        avgScore: row.avgScore,
        bonus: calculateIndividualBonus({
          bonusPool,
          individualKpi: row.avgScore,
          totalEligibleKpi,
        }),
      }))
      .sort((left, right) => right.bonus - left.bonus),
    activeFinanceYear: finance?.year ?? currentYear,
    finance: finance
      ? {
          year: finance.year,
          netProfit: finance.netProfit,
          bonusPool: finance.bonusPool,
        }
      : null,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  const [
    teamUsers,
    attendanceRows,
    progressRows,
    completedProgressRows,
    openProgressCount,
    completedProgressCount,
    monthlyRows,
  ] =
    await Promise.all([
      getAssignableUsers(),
      prisma.attendance.findMany({
        where: {
          date: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.dailyProgress.findMany({
        where: {
          closing: false,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
      prisma.dailyProgress.findMany({
        where: {
          closing: true,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 6,
      }),
      prisma.dailyProgress.count({
        where: {
          closing: false,
        },
      }),
      prisma.dailyProgress.count({
        where: {
          closing: true,
        },
      }),
      prisma.kpiMonthly.findMany({
        orderBy: [
          {
            year: "desc",
          },
          {
            month: "desc",
          },
          {
            totalScore: "desc",
          },
        ],
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        take: 8,
      }),
    ]);

  const attendanceToday = mapAttendanceRows(attendanceRows);

  return {
    teamUsers,
    attendanceSummary: summarizeAttendance(attendanceToday),
    progressRows: mapProgressRows(progressRows),
    completedProgressRows: mapProgressRows(completedProgressRows),
    openProgressCount,
    completedProgressCount,
    monthlyKpis: mapMonthlyKpis(monthlyRows),
  };
}

export async function getEmployeeDashboardData(userId: string): Promise<EmployeeDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [attendanceToday, recentAttendance, progressRows, monthlyKpi, yearlyKpi] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    }),
    prisma.dailyProgress.findMany({
      where: {
        userId,
        closing: false,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.kpiMonthly.findUnique({
      where: {
        userId_year_month: {
          userId,
          year: currentYear,
          month: currentMonth,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.kpiYearly.findUnique({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const mappedMonthly = monthlyKpi ? mapMonthlyKpis([monthlyKpi])[0] : null;
  const mappedYearly = yearlyKpi ? mapYearlyKpis([yearlyKpi])[0] : null;

  return {
    attendanceToday: attendanceToday ? mapAttendanceRows([attendanceToday])[0] : null,
    recentAttendance: mapAttendanceRows(recentAttendance),
    progressRows: mapProgressRows(progressRows),
    monthlyKpi: mappedMonthly,
    yearlyKpi: mappedYearly,
    narrative: getKpiNarrative(mappedMonthly?.totalScore, mappedYearly?.avgScore),
    scheduleLabel: getWorkdaySchedule(now).label,
  };
}

export function getOwnerOverviewLabel(month: number, year: number) {
  return formatMonthYear(month, year);
}
