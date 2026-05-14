import { AttendanceStatus, UserRole } from "@prisma/client";

import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  calculateIndividualBonus,
  formatMonthYear,
  getAppDateParts,
  getWorkdaySchedule,
  getKpiNarrative,
  resolveAttendanceStatus,
  startOfDay,
} from "@/lib/utils";
import type {
  AdminDashboardData,
  AttendanceItem,
  BonusSimulationItem,
  DashboardMonthOption,
  EmployeeDashboardData,
  EmployeeStopCardItem,
  LockedKpiSelection,
  LockedKpiMonthItem,
  MonthlyKpiItem,
  OwnerStopCardItem,
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
    status:
      row.status === AttendanceStatus.OFF
        ? AttendanceStatus.OFF
        : resolveAttendanceStatus(row.date, row.checkIn),
    checkIn: row.checkIn,
    checkOut: row.checkOut,
  }));
}

function mapProgressRows(
  rows: Array<{
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
  }>,
): ProgressItem[] {
  return rows.map((row) => ({
    id: row.id,
    pekerjaan: row.pekerjaan,
    detail: row.detail,
    userId: row.userId,
    name: row.user.name,
    targetSelesai: row.targetSelesai,
    tanggalMulai: row.tanggalMulai,
    tanggalSelesai: row.tanggalSelesai,
    tanggalRevisi: row.tanggalRevisi,
    revisiDone: row.revisiDone,
    closing: row.closing,
    isDone: row.isDone,
    canceledAt: row.canceledAt,
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

function mapLockedKpiMonths(
  rows: Array<{
    year: number;
    month: number;
    lockedAt: Date;
    lockedBy: {
      name: string;
    };
  }>,
): LockedKpiMonthItem[] {
  return rows.map((row) => ({
    key: `${row.year}-${row.month}`,
    label: formatMonthYear(row.month, row.year),
    lockedAt: row.lockedAt,
    lockedByName: row.lockedBy.name,
  }));
}

function mapOwnerStopCards(
  rows: Array<{
    id: string;
    title: string;
    content: string;
    status: OwnerStopCardItem["status"];
    createdAt: Date;
    updatedAt: Date;
  }>,
): OwnerStopCardItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

function mapEmployeeStopCards(
  rows: Array<{
    id: string;
    title: string;
    content: string;
    status: EmployeeStopCardItem["status"];
    createdAt: Date;
    updatedAt: Date;
  }>,
): EmployeeStopCardItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

function sortMonthlyKpisAlphabetically(rows: MonthlyKpiItem[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name, "id"));
}

function buildMonthKey(year: number, month: number) {
  return `${year}-${month}`;
}

function parseMonthKey(monthKey?: string | null) {
  if (!monthKey) {
    return null;
  }

  const matched = monthKey.trim().match(/^(\d{4})-(\d{1,2})$/);

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

function compareYearMonth(
  left: {
    year: number;
    month: number;
  },
  right: {
    year: number;
    month: number;
  },
) {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  return left.month - right.month;
}

function buildMonthOptions(rows: Array<{ year: number; month: number }>): DashboardMonthOption[] {
  const uniqueRows = new Map<string, DashboardMonthOption>();

  rows.forEach((row) => {
    const key = buildMonthKey(row.year, row.month);

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, {
        key,
        label: formatMonthYear(row.month, row.year),
        year: row.year,
        month: row.month,
      });
    }
  });

  return Array.from(uniqueRows.values()).sort((left, right) => compareYearMonth(right, left));
}

function findMonthOption(options: DashboardMonthOption[], monthKey?: string | null) {
  if (!monthKey) {
    return null;
  }

  return options.find((option) => option.key === monthKey) ?? null;
}

function getInclusiveMonthRange(start: DashboardMonthOption, end: DashboardMonthOption) {
  const months: DashboardMonthOption[] = [];
  let year = start.year;
  let month = start.month;

  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({
      key: buildMonthKey(year, month),
      label: formatMonthYear(month, year),
      year,
      month,
    });

    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

function formatSimulationPeriodLabel(start: DashboardMonthOption, end: DashboardMonthOption) {
  if (start.key === end.key) {
    return start.label;
  }

  return `${start.label} - ${end.label}`;
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
      email: {
        notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
      },
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

async function buildOwnerDashboardData(input?: {
  lockedMonthKey?: string;
  simulationAmount?: string;
  simulationEndMonthKey?: string;
  simulationStartMonthKey?: string;
}): Promise<OwnerDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const { month: currentMonth, year: currentYear } = getAppDateParts(now);

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
    allMonthlyPeriodRows,
    lockedKpiRows,
    stopCardRows,
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
        canceledAt: null,
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
    }),
    prisma.dailyProgress.findMany({
      where: {
        closing: true,
        hiddenFromDashboard: false,
        canceledAt: null,
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
        hiddenFromDashboard: false,
        canceledAt: null,
      },
    }),
    prisma.dailyProgress.count({
      where: {
        closing: false,
        canceledAt: null,
      },
    }),
    prisma.kpiMonthly.findMany({
      where: {
        year: currentYear,
        month: currentMonth,
        user: {
          role: UserRole.KARYAWAN,
          email: {
            notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
          },
        },
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
        user: {
          role: UserRole.KARYAWAN,
          email: {
            notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
          },
        },
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
    prisma.kpiMonthly.findMany({
      where: {
        user: {
          role: UserRole.KARYAWAN,
          email: {
            notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
          },
        },
      },
      select: {
        year: true,
        month: true,
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          month: "desc",
        },
      ],
    }),
    prisma.kpiMonthLock.findMany({
      include: {
        lockedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          month: "desc",
        },
      ],
      take: 6,
    }),
    prisma.stopCard.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.companyFinance.findFirst({
      orderBy: {
        year: "desc",
      },
    }),
  ]);

  const attendanceToday = mapAttendanceRows(attendanceRows);
  const monthlyKpis = sortMonthlyKpisAlphabetically(mapMonthlyKpis(monthlyRows));
  const yearlyKpis = mapYearlyKpis(yearlyRows);
  const bonusPool = finance?.bonusPool ?? 0;
  const eligibleKpis = yearlyKpis.filter((row) => row.avgScore >= 70);
  const totalEligibleKpi = eligibleKpis.reduce((sum, row) => sum + row.avgScore, 0);
  const lockedKpiMonthOptions = buildMonthOptions(
    lockedKpiRows.map((row) => ({
      year: row.year,
      month: row.month,
    })),
  );
  const selectedLockedMonth =
    findMonthOption(lockedKpiMonthOptions, input?.lockedMonthKey) ?? lockedKpiMonthOptions[0] ?? null;
  const selectedLockedMonthMeta = selectedLockedMonth
    ? lockedKpiRows.find(
        (row) => row.year === selectedLockedMonth.year && row.month === selectedLockedMonth.month,
      ) ?? null
    : null;
  const selectedLockedMonthlyRows = selectedLockedMonth
    ? await prisma.kpiMonthly.findMany({
        where: {
          year: selectedLockedMonth.year,
          month: selectedLockedMonth.month,
          user: {
            role: UserRole.KARYAWAN,
            email: {
              notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
            },
          },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      })
    : [];
  const simulationMonthOptions = buildMonthOptions(allMonthlyPeriodRows);
  const defaultSimulationMonth = simulationMonthOptions[0] ?? null;
  const requestedSimulationStart =
    findMonthOption(simulationMonthOptions, input?.simulationStartMonthKey) ?? defaultSimulationMonth;
  const requestedSimulationEnd =
    findMonthOption(simulationMonthOptions, input?.simulationEndMonthKey) ?? defaultSimulationMonth;

  let simulationStartMonth = requestedSimulationStart;
  let simulationEndMonth = requestedSimulationEnd;

  if (
    simulationStartMonth &&
    simulationEndMonth &&
    compareYearMonth(simulationStartMonth, simulationEndMonth) > 0
  ) {
    simulationStartMonth = requestedSimulationEnd;
    simulationEndMonth = requestedSimulationStart;
  }

  const simulationRangeMonths =
    simulationStartMonth && simulationEndMonth
      ? getInclusiveMonthRange(simulationStartMonth, simulationEndMonth)
      : [];
  const normalizedSimulationAmount = input?.simulationAmount?.trim();
  const simulationAmountValue =
    normalizedSimulationAmount && normalizedSimulationAmount.length > 0
      ? Number(normalizedSimulationAmount)
      : Number.NaN;
  const simulationAmount =
    !Number.isNaN(simulationAmountValue) && simulationAmountValue >= 0
      ? simulationAmountValue
      : bonusPool;
  const simulationRowsRaw =
    simulationRangeMonths.length > 0
      ? await prisma.kpiMonthly.findMany({
          where: {
            OR: simulationRangeMonths.map((monthItem) => ({
              year: monthItem.year,
              month: monthItem.month,
            })),
            user: {
              role: UserRole.KARYAWAN,
              email: {
                notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
              },
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];
  const lockedMonthKeySet = new Set(lockedKpiRows.map((row) => buildMonthKey(row.year, row.month)));
  const simulationIsFullyLocked =
    simulationRangeMonths.length > 0 &&
    simulationRangeMonths.every((monthItem) => lockedMonthKeySet.has(monthItem.key));
  const userKpiMap = new Map<string, { name: string; totalScore: number; monthsCount: number }>();

  simulationRowsRaw.forEach((row) => {
    const existing = userKpiMap.get(row.user.id) ?? {
      name: row.user.name,
      totalScore: 0,
      monthsCount: 0,
    };

    existing.totalScore += row.totalScore;
    existing.monthsCount += 1;
    userKpiMap.set(row.user.id, existing);
  });

  const simulationItems = teamUsers.map<BonusSimulationItem>((user) => {
    const summary = userKpiMap.get(user.id);
    const averageScore =
      summary && summary.monthsCount > 0 ? Number((summary.totalScore / summary.monthsCount).toFixed(2)) : 0;

    return {
      userId: user.id,
      name: user.name,
      averageScore,
      monthsCount: summary?.monthsCount ?? 0,
      bonus: 0,
    };
  });
  const eligibleSimulationItems = simulationItems.filter((row) => row.averageScore >= 70);
  const simulationEligibleTotal = eligibleSimulationItems.reduce(
    (sum, row) => sum + row.averageScore,
    0,
  );
  const simulationRows = simulationItems
    .map((row) => ({
      ...row,
      bonus: calculateIndividualBonus({
        bonusPool: simulationAmount,
        individualKpi: row.averageScore,
        totalEligibleKpi: simulationEligibleTotal,
      }),
    }))
    .sort((left, right) => {
      if (right.bonus !== left.bonus) {
        return right.bonus - left.bonus;
      }

      return left.name.localeCompare(right.name, "id");
    });

  return {
    teamSize: users.length,
    teamUsers,
    monthlyKpiPeriodLabel: formatMonthYear(currentMonth, currentYear),
    monthlyKpiIsFinal: lockedKpiRows.some(
      (row) => row.year === currentYear && row.month === currentMonth,
    ),
    lockedKpiMonthOptions,
    selectedLockedKpiMonth: selectedLockedMonth && selectedLockedMonthMeta
      ? ({
          key: selectedLockedMonth.key,
          label: selectedLockedMonth.label,
          lockedAt: selectedLockedMonthMeta.lockedAt,
          lockedByName: selectedLockedMonthMeta.lockedBy.name,
        } satisfies LockedKpiSelection)
      : null,
    selectedLockedMonthlyKpis: sortMonthlyKpisAlphabetically(mapMonthlyKpis(selectedLockedMonthlyRows)),
    attendanceToday,
    attendanceSummary: summarizeAttendance(attendanceToday),
    recentProgress: mapProgressRows(progressRows),
    completedProgressRows: mapProgressRows(completedProgressRows),
    completedProgressCount,
    openProgressCount,
    monthlyKpis,
    yearlyKpis,
    lockedKpiMonths: mapLockedKpiMonths(lockedKpiRows),
    stopCards: mapOwnerStopCards(stopCardRows),
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
    simulationMonthOptions,
    simulationStartMonthKey: simulationStartMonth?.key ?? "",
    simulationEndMonthKey: simulationEndMonth?.key ?? "",
    simulationAmount,
    simulationIsFullyLocked,
    simulationPeriodLabel:
      simulationStartMonth && simulationEndMonth
        ? formatSimulationPeriodLabel(simulationStartMonth, simulationEndMonth)
        : "Belum ada periode KPI",
    simulationRows,
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

export async function getOwnerDashboardData(input?: {
  lockedMonthKey?: string;
  simulationAmount?: string;
  simulationEndMonthKey?: string;
  simulationStartMonthKey?: string;
}): Promise<OwnerDashboardData> {
  return buildOwnerDashboardData(input);
}

async function buildAdminDashboardData(): Promise<AdminDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const { month: currentMonth, year: currentYear } = getAppDateParts(now);

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
          canceledAt: null,
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
      }),
      prisma.dailyProgress.findMany({
        where: {
          closing: true,
          hiddenFromDashboard: false,
          canceledAt: null,
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
          canceledAt: null,
        },
      }),
      prisma.dailyProgress.count({
        where: {
          closing: true,
          hiddenFromDashboard: false,
          canceledAt: null,
        },
      }),
      prisma.kpiMonthly.findMany({
        where: {
          year: currentYear,
          month: currentMonth,
          user: {
            role: UserRole.KARYAWAN,
            email: {
              notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
            },
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

  const attendanceToday = mapAttendanceRows(attendanceRows);

  return {
    teamUsers,
    attendanceSummary: summarizeAttendance(attendanceToday),
    progressRows: mapProgressRows(progressRows),
    completedProgressRows: mapProgressRows(completedProgressRows),
    openProgressCount,
    completedProgressCount,
    monthlyKpis: sortMonthlyKpisAlphabetically(mapMonthlyKpis(monthlyRows)),
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  return buildAdminDashboardData();
}

async function buildEmployeeDashboardData(userId: string): Promise<EmployeeDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const { month: currentMonth, year: currentYear } = getAppDateParts(now);

  const [attendanceToday, recentAttendance, progressRows, monthlyKpi, yearlyKpi, stopCardRows] = await Promise.all([
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
      take: 7,
    }),
    prisma.dailyProgress.findMany({
      where: {
        userId,
        closing: false,
        canceledAt: null,
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
    prisma.stopCard.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
    stopCards: mapEmployeeStopCards(stopCardRows),
    narrative: getKpiNarrative(mappedMonthly?.totalScore, mappedYearly?.avgScore),
    scheduleLabel: getWorkdaySchedule(now).label,
  };
}

export async function getEmployeeDashboardData(userId: string): Promise<EmployeeDashboardData> {
  return buildEmployeeDashboardData(userId);
}

export function getOwnerOverviewLabel(month: number, year: number) {
  return formatMonthYear(month, year);
}
