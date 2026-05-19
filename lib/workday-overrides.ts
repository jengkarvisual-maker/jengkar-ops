import { WorkdayOverrideType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  formatDateInput,
  getAppDateParts,
  getWorkdaySchedule,
  startOfDay,
  type WorkdaySchedule,
} from "@/lib/utils";

export type WorkdayOverrideRow = {
  date: Date;
  type: WorkdayOverrideType;
  label: string;
  startTime: string | null;
  endTime: string | null;
};

export type ResolvedWorkdaySchedule = WorkdaySchedule & {
  source: "default" | "override";
  overrideType?: WorkdayOverrideType;
  overrideLabel?: string;
};

export function buildWorkdayDateKey(value: Date) {
  return formatDateInput(startOfDay(value));
}

export function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function resolveWorkdaySchedule(
  date: Date,
  override?: WorkdayOverrideRow | null,
): ResolvedWorkdaySchedule {
  const defaultSchedule = getWorkdaySchedule(date);

  if (!override) {
    return {
      ...defaultSchedule,
      source: "default",
    };
  }

  if (override.type === WorkdayOverrideType.HOLIDAY) {
    return {
      isOff: true,
      label: override.label,
      start: defaultSchedule.start,
      end: defaultSchedule.end,
      source: "override",
      overrideType: override.type,
      overrideLabel: override.label,
    };
  }

  const start = override.startTime ?? defaultSchedule.start;
  const end = override.endTime ?? defaultSchedule.end;

  return {
    isOff: false,
    label: `${override.label} ${start}-${end}`,
    start,
    end,
    source: "override",
    overrideType: override.type,
    overrideLabel: override.label,
  };
}

export async function getWorkdayOverrideForDate(date: Date) {
  return prisma.workdayOverride.findUnique({
    where: {
      date: startOfDay(date),
    },
    select: {
      date: true,
      type: true,
      label: true,
      startTime: true,
      endTime: true,
    },
  });
}

export async function getWorkdayOverrideMapForRange(start: Date, endExclusive: Date) {
  const rows = await prisma.workdayOverride.findMany({
    where: {
      date: {
        gte: start,
        lt: endExclusive,
      },
    },
    select: {
      date: true,
      type: true,
      label: true,
      startTime: true,
      endTime: true,
    },
  });

  return new Map(rows.map((row) => [buildWorkdayDateKey(row.date), row]));
}

export async function getWorkdayOverrideMapForDates(values: Array<Date | null | undefined>) {
  const dateKeys = Array.from(
    new Set(
      values
        .filter((value): value is Date => Boolean(value))
        .map((value) => buildWorkdayDateKey(value)),
    ),
  );

  if (dateKeys.length === 0) {
    return new Map<string, WorkdayOverrideRow>();
  }

  const dates = dateKeys
    .map((key) => {
      const [year, month, day] = key.split("-").map(Number);

      if (![year, month, day].every((value) => Number.isFinite(value))) {
        return null;
      }

      return startOfDay(new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)));
    })
    .filter((value): value is Date => {
      if (!value) {
        return false;
      }

      return !Number.isNaN(value.getTime());
    });

  if (dates.length === 0) {
    return new Map<string, WorkdayOverrideRow>();
  }

  const rows = await prisma.workdayOverride.findMany({
    where: {
      date: {
        in: dates,
      },
    },
    select: {
      date: true,
      type: true,
      label: true,
      startTime: true,
      endTime: true,
    },
  });

  return new Map(rows.map((row) => [buildWorkdayDateKey(row.date), row]));
}

export function getWorkdayOverrideLabel(date: Date, override?: WorkdayOverrideRow | null) {
  const schedule = resolveWorkdaySchedule(date, override);
  const { weekday } = getAppDateParts(date);

  if (schedule.source === "override" && schedule.overrideType === WorkdayOverrideType.HOLIDAY) {
    return `${weekday} - ${schedule.overrideLabel ?? schedule.label}`;
  }

  return schedule.label;
}
