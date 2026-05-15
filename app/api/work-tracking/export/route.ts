import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { getMonthlyAddonSummary, getMonthlyOvertimeSummary } from "@/lib/work-tracking";
import { formatDateInput, formatMonthYear, formatTime } from "@/lib/utils";

function parseMonthKey(monthKey: string | null) {
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

function csvResponse(filename: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUserProfile();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== UserRole.OWNER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const monthKey = parseMonthKey(searchParams.get("monthKey"));
  const userId = searchParams.get("userId")?.trim() || undefined;

  if (!monthKey) {
    return NextResponse.json({ message: "Bulan filter belum valid." }, { status: 400 });
  }

  if (userId) {
    const employee = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!employee || employee.role !== UserRole.KARYAWAN) {
      return NextResponse.json({ message: "Karyawan filter tidak ditemukan." }, { status: 404 });
    }
  }

  const [overtimeSummary, addonSummary] = await Promise.all([
    getMonthlyOvertimeSummary({
      year: monthKey.year,
      month: monthKey.month,
      userId,
    }),
    getMonthlyAddonSummary({
      year: monthKey.year,
      month: monthKey.month,
      userId,
    }),
  ]);

  if (overtimeSummary.rows.length === 0 && addonSummary.rows.length === 0) {
    return NextResponse.json(
      { message: "Belum ada data lembur atau add-on untuk filter yang dipilih." },
      { status: 404 },
    );
  }

  const addonMap = new Map<string, typeof addonSummary.rows>();

  addonSummary.rows.forEach((row) => {
    const key = `${row.userId}:${formatDateInput(row.addonDate)}`;
    addonMap.set(key, [...(addonMap.get(key) ?? []), row]);
  });

  const rows: Array<Record<string, string | number>> = [];
  const consumedAddonKeys = new Set<string>();
  const monthLabel = formatMonthYear(monthKey.month, monthKey.year);

  overtimeSummary.rows.forEach((row) => {
    const key = `${row.userId}:${formatDateInput(row.date)}`;
    const addonRows = addonMap.get(key) ?? [];

    if (addonRows.length === 0) {
      rows.push({
        nama: row.name,
        tanggal: formatDateInput(row.date),
        bulan: monthLabel,
        jamCheckOut: formatTime(row.checkOut),
        jumlahJamLemburPerHari: row.overtimeHours,
        totalJamLemburPerBulan: row.monthTotalHours,
        jenisPekerjaanAddon: "",
        jumlahPekerjaanAddonPerHari: 0,
        totalPekerjaanAddonPerBulan: 0,
      });
      return;
    }

    consumedAddonKeys.add(key);

    addonRows.forEach((addonRow) => {
      rows.push({
        nama: row.name,
        tanggal: formatDateInput(row.date),
        bulan: monthLabel,
        jamCheckOut: formatTime(row.checkOut),
        jumlahJamLemburPerHari: row.overtimeHours,
        totalJamLemburPerBulan: row.monthTotalHours,
        jenisPekerjaanAddon: addonRow.addonTypeLabel,
        jumlahPekerjaanAddonPerHari: addonRow.addonQuantity,
        totalPekerjaanAddonPerBulan: addonRow.monthTotalQuantity,
      });
    });
  });

  addonSummary.rows.forEach((row) => {
    const key = `${row.userId}:${formatDateInput(row.addonDate)}`;

    if (consumedAddonKeys.has(key)) {
      return;
    }

    rows.push({
      nama: row.name,
      tanggal: formatDateInput(row.addonDate),
      bulan: monthLabel,
      jamCheckOut: "",
      jumlahJamLemburPerHari: 0,
      totalJamLemburPerBulan: 0,
      jenisPekerjaanAddon: row.addonTypeLabel,
      jumlahPekerjaanAddonPerHari: row.addonQuantity,
      totalPekerjaanAddonPerBulan: row.monthTotalQuantity,
    });
  });

  const filenameUserSuffix = userId ? `-${userId}` : "-all";
  return csvResponse(
    `ops-work-tracking-${monthKey.year}-${`${monthKey.month}`.padStart(2, "0")}${filenameUserSuffix}.csv`,
    toCsv(rows),
  );
}
