import { AddonType, Prisma, UserRole } from "@prisma/client";

import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  formatMonthYear,
  getAppDateParts,
  getAppTimeOnDate,
  getMonthBounds,
  roundNumber,
} from "@/lib/utils";
import type { DashboardMonthOption, EmployeeAddonItem, OvertimeItem } from "@/types/dashboard";

export const ADDON_TYPE_LABELS: Record<AddonType, string> = {
  TALENT_KONTEN: "Talent Konten",
  MOTRET_TPW: "Motret TPW",
  MOTRET_PHS: "Motret PHS",
  MOTRET_JV: "Motret JV",
  ASSIST_MAKEUP: "Assist Makeup",
  LUAR_KOTA: "Luar Kota",
};

export const ADDON_TYPE_OPTIONS = (Object.entries(ADDON_TYPE_LABELS) as Array<
  [AddonType, string]
>).map(([value, label]) => ({
  value,
  label,
}));

export function getAddonTypeLabel(type: AddonType) {
  return ADDON_TYPE_LABELS[type];
}

export function isEmployeeAddonStorageUnavailable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2022";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    return error.message.includes("EmployeeAddon") || error.message.includes("employeeAddon");
  }

  return false;
}

export function buildRecentMonthOptions(count = 12, anchor = new Date()): DashboardMonthOption[] {
  const { year, month } = getAppDateParts(anchor);
  const options: DashboardMonthOption[] = [];

  for (let index = 0; index < count; index += 1) {
    const totalMonths = year * 12 + (month - 1) - index;
    const optionYear = Math.floor(totalMonths / 12);
    const optionMonth = (totalMonths % 12) + 1;

    options.push({
      key: `${optionYear}-${optionMonth}`,
      label: formatMonthYear(optionMonth, optionYear),
      year: optionYear,
      month: optionMonth,
    });
  }

  return options;
}

export function findMonthOption(
  options: DashboardMonthOption[],
  monthKey?: string | null,
) {
  if (!monthKey) {
    return null;
  }

  return options.find((option) => option.key === monthKey) ?? null;
}

export function calculateOvertimeHours(
  date: Date,
  checkOut: Date | null | undefined,
) {
  if (!checkOut) {
    return 0;
  }

  const threshold = getAppTimeOnDate(date, 16, 0, 0);
  const diffMs = checkOut.getTime() - threshold.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  return roundNumber(diffMs / (1000 * 60 * 60), 2);
}

function buildEmployeeWhere(userId?: string) {
  if (!userId) {
    return {
      role: UserRole.KARYAWAN,
      email: {
        notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
      },
    };
  }

  return {
    role: UserRole.KARYAWAN,
    id: userId,
    email: {
      notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
    },
  };
}

export async function getMonthlyOvertimeSummary(input: {
  year: number;
  month: number;
  userId?: string;
}) {
  const { start, end } = getMonthBounds(input.year, input.month);
  const attendanceRows = await prisma.attendance.findMany({
    where: {
      date: {
        gte: start,
        lt: end,
      },
      checkOut: {
        not: null,
      },
      user: buildEmployeeWhere(input.userId),
    },
    select: {
      id: true,
      userId: true,
      date: true,
      checkOut: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
  });

  const rowsWithHours = attendanceRows
    .map((row) => ({
      attendanceId: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      date: row.date,
      checkOut: row.checkOut!,
      overtimeHours: calculateOvertimeHours(row.date, row.checkOut),
    }))
    .filter((row) => row.overtimeHours > 0);

  const monthlyTotals = rowsWithHours.reduce<Map<string, number>>((map, row) => {
    map.set(row.userId, roundNumber((map.get(row.userId) ?? 0) + row.overtimeHours, 2));
    return map;
  }, new Map());

  const rows: OvertimeItem[] = rowsWithHours.map((row) => ({
    ...row,
    monthTotalHours: monthlyTotals.get(row.userId) ?? row.overtimeHours,
  }));

  return {
    rows,
    totalHours: roundNumber(rows.reduce((sum, row) => sum + row.overtimeHours, 0), 2),
  };
}

export async function getMonthlyAddonSummary(input: {
  year: number;
  month: number;
  userId?: string;
}) {
  const { start, end } = getMonthBounds(input.year, input.month);
  let addonRows: Array<{
    id: string;
    userId: string;
    addonDate: Date;
    addonType: AddonType;
    addonQuantity: number;
    createdAt: Date;
    updatedAt: Date;
    user: {
      name: string;
      email: string;
    };
  }> = [];

  try {
    addonRows = await prisma.employeeAddon.findMany({
      where: {
        addonDate: {
          gte: start,
          lt: end,
        },
        user: buildEmployeeWhere(input.userId),
      },
      select: {
        id: true,
        userId: true,
        addonDate: true,
        addonType: true,
        addonQuantity: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ addonDate: "desc" }, { createdAt: "desc" }, { user: { name: "asc" } }],
    });
  } catch (error) {
    if (!isEmployeeAddonStorageUnavailable(error)) {
      throw error;
    }

    console.warn("[employee-addon] storage unavailable, returning empty summary");
  }

  const monthlyTotals = addonRows.reduce<Map<string, number>>((map, row) => {
    map.set(row.userId, (map.get(row.userId) ?? 0) + row.addonQuantity);
    return map;
  }, new Map());

  const rows: EmployeeAddonItem[] = addonRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    addonDate: row.addonDate,
    addonType: row.addonType,
    addonTypeLabel: getAddonTypeLabel(row.addonType),
    addonQuantity: row.addonQuantity,
    monthTotalQuantity: monthlyTotals.get(row.userId) ?? row.addonQuantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return {
    rows,
    totalQuantity: rows.reduce((sum, row) => sum + row.addonQuantity, 0),
  };
}
