import { AttendanceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildActiveKaryawanWhere } from "@/lib/user-archiving";
import {
  buildWorkdayDateKey,
  getWorkdayOverrideMapForRange,
  resolveWorkdaySchedule,
} from "@/lib/workday-overrides";
import {
  calculateIndividualBonus,
  formatMonthYear,
  getMonthBounds,
  resolveAttendanceStatus,
  roundNumber,
} from "@/lib/utils";
import {
  buildRecentMonthOptions,
  calculateOvertimeHours,
  findMonthOption,
  getMonthlyAddonSummary,
  getMonthlyOvertimeSummary,
} from "@/lib/work-tracking";
import type {
  MonthlyKpiItem,
  SlipGajiAddonItem,
  SlipGajiData,
} from "@/types/dashboard";

function createEmptySlipGajiData(anchor = new Date()): SlipGajiData {
  const monthOptions = buildRecentMonthOptions(12, anchor);
  const selectedMonth = monthOptions[0] ?? null;

  return {
    monthOptions,
    selectedMonthKey: selectedMonth?.key ?? "",
    selectedMonthLabel: selectedMonth?.label ?? "Belum ada periode",
    selectedUserId: "",
    selectedUserName: null,
    attendanceRecap: {
      onTime: 0,
      late: 0,
      checkoutAfterFive: 0,
    },
    overtimeTotalHours: 0,
    addonItems: [],
    addonTotalQuantity: 0,
    monthlyKpi: null,
    averageKpi: null,
    bonusKpi: 0,
    bonusKpiAvailable: false,
    bonusKpiMessage: null,
    financeBonusPool: 0,
  };
}

function mapMonthlyKpiRow(row: {
  id: string;
  userId: string;
  year: number;
  month: number;
  scoreKinerja: number;
  scoreDisiplin: number;
  totalScore: number;
  user: {
    name: string;
  };
}): MonthlyKpiItem {
  return {
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    year: row.year,
    month: row.month,
    scoreKinerja: row.scoreKinerja,
    scoreDisiplin: row.scoreDisiplin,
    totalScore: row.totalScore,
  };
}

function aggregateAddonItems(
  rows: Awaited<ReturnType<typeof getMonthlyAddonSummary>>["rows"],
): SlipGajiAddonItem[] {
  const map = new Map<string, SlipGajiAddonItem>();

  rows.forEach((row) => {
    const existing = map.get(row.addonType) ?? {
      addonType: row.addonType,
      addonTypeLabel: row.addonTypeLabel,
      quantity: 0,
    };

    existing.quantity += row.addonQuantity;
    map.set(row.addonType, existing);
  });

  return Array.from(map.values()).sort((left, right) =>
    left.addonTypeLabel.localeCompare(right.addonTypeLabel, "id"),
  );
}

export async function getOwnerSlipGajiData(input?: {
  userId?: string;
  monthKey?: string;
  anchor?: Date;
}): Promise<SlipGajiData> {
  const baseData = createEmptySlipGajiData(input?.anchor);
  const selectedMonth =
    findMonthOption(baseData.monthOptions, input?.monthKey) ?? baseData.monthOptions[0] ?? null;

  if (!selectedMonth) {
    return baseData;
  }

  const selectedUserId = input?.userId?.trim() ?? "";

  if (!selectedUserId) {
    return {
      ...baseData,
      selectedMonthKey: selectedMonth.key,
      selectedMonthLabel: selectedMonth.label,
    };
  }

  const employeeWhere = await buildActiveKaryawanWhere(selectedUserId);
  const employee = await prisma.user.findFirst({
    where: employeeWhere,
    select: {
      id: true,
      name: true,
    },
  });

  if (!employee) {
    return {
      ...baseData,
      selectedMonthKey: selectedMonth.key,
      selectedMonthLabel: selectedMonth.label,
      selectedUserId,
    };
  }

  const { start, end } = getMonthBounds(selectedMonth.year, selectedMonth.month);
  const activeEmployeeWhere = await buildActiveKaryawanWhere();

  const [
    attendanceRows,
    overrideMap,
    overtimeSummary,
    addonSummary,
    monthlyKpiRow,
    allMonthlyKpiRowsForUser,
    allMonthlyKpiRowsForPeriod,
    finance,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        userId: employee.id,
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
      orderBy: {
        date: "asc",
      },
    }),
    getWorkdayOverrideMapForRange(start, end),
    getMonthlyOvertimeSummary({
      year: selectedMonth.year,
      month: selectedMonth.month,
      userId: employee.id,
    }),
    getMonthlyAddonSummary({
      year: selectedMonth.year,
      month: selectedMonth.month,
      userId: employee.id,
    }),
    prisma.kpiMonthly.findUnique({
      where: {
        userId_year_month: {
          userId: employee.id,
          year: selectedMonth.year,
          month: selectedMonth.month,
        },
      },
      select: {
        id: true,
        userId: true,
        year: true,
        month: true,
        scoreKinerja: true,
        scoreDisiplin: true,
        totalScore: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.kpiMonthly.findMany({
      where: {
        userId: employee.id,
      },
      select: {
        totalScore: true,
      },
    }),
    prisma.kpiMonthly.findMany({
      where: {
        year: selectedMonth.year,
        month: selectedMonth.month,
        user: {
          ...activeEmployeeWhere,
        },
      },
      select: {
        totalScore: true,
      },
    }),
    prisma.companyFinance.findFirst({
      where: {
        year: selectedMonth.year,
      },
      orderBy: {
        year: "desc",
      },
      select: {
        year: true,
        bonusPool: true,
      },
    }),
  ]);

  const attendanceRecap = attendanceRows.reduce(
    (summary, row) => {
      const status =
        row.status === AttendanceStatus.OFF
          ? AttendanceStatus.OFF
          : resolveAttendanceStatus(
              row.date,
              row.checkIn,
              resolveWorkdaySchedule(row.date, overrideMap.get(buildWorkdayDateKey(row.date))),
            );

      if (status === AttendanceStatus.ONTIME) {
        summary.onTime += 1;
      } else if (status === AttendanceStatus.LATE) {
        summary.late += 1;
      }

      if (calculateOvertimeHours(row.date, row.checkOut) > 0) {
        summary.checkoutAfterFive += 1;
      }

      return summary;
    },
    {
      onTime: 0,
      late: 0,
      checkoutAfterFive: 0,
    },
  );

  const addonItems = aggregateAddonItems(addonSummary.rows);
  const monthlyKpi = monthlyKpiRow ? mapMonthlyKpiRow(monthlyKpiRow) : null;
  const averageKpi =
    allMonthlyKpiRowsForUser.length > 0
      ? roundNumber(
          allMonthlyKpiRowsForUser.reduce((sum, row) => sum + row.totalScore, 0) /
            allMonthlyKpiRowsForUser.length,
          2,
        )
      : null;
  const financeBonusPool = finance?.bonusPool ?? 0;
  const totalEligibleKpi = allMonthlyKpiRowsForPeriod
    .filter((row) => row.totalScore >= 70)
    .reduce((sum, row) => sum + row.totalScore, 0);

  const bonusKpi =
    monthlyKpi && financeBonusPool > 0
      ? calculateIndividualBonus({
          bonusPool: financeBonusPool,
          individualKpi: monthlyKpi.totalScore,
          totalEligibleKpi,
        })
      : 0;

  let bonusKpiAvailable = false;
  let bonusKpiMessage: string | null = null;

  if (!monthlyKpi) {
    bonusKpiMessage = "Bonus KPI belum tersedia untuk bulan ini.";
  } else if (financeBonusPool <= 0) {
    bonusKpiMessage = "Bonus KPI belum tersedia untuk bulan ini.";
  } else if (totalEligibleKpi <= 0) {
    bonusKpiMessage = "Belum ada karyawan yang memenuhi ambang bonus pada periode ini.";
  } else {
    bonusKpiAvailable = true;
  }

  return {
    ...baseData,
    selectedMonthKey: selectedMonth.key,
    selectedMonthLabel: selectedMonth.label,
    selectedUserId: employee.id,
    selectedUserName: employee.name,
    attendanceRecap,
    overtimeTotalHours: overtimeSummary.totalHours,
    addonItems,
    addonTotalQuantity: addonSummary.totalQuantity,
    monthlyKpi,
    averageKpi,
    bonusKpi,
    bonusKpiAvailable,
    bonusKpiMessage,
    financeBonusPool,
  };
}

export function formatSlipMonthLabel(monthKey?: string | null) {
  if (!monthKey) {
    return "";
  }

  const match = monthKey.trim().match(/^(\d{4})-(\d{1,2})$/);

  if (!match) {
    return "";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return "";
  }

  return formatMonthYear(month, year);
}
