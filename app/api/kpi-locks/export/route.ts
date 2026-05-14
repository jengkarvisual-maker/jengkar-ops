import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMonthYear } from "@/lib/utils";

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

  if (!monthKey) {
    return NextResponse.json({ message: "Periode KPI belum valid." }, { status: 400 });
  }

  const lockRow = await prisma.kpiMonthLock.findUnique({
    where: {
      year_month: {
        year: monthKey.year,
        month: monthKey.month,
      },
    },
    include: {
      lockedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!lockRow) {
    return NextResponse.json(
      { message: "Periode ini belum terkunci, jadi CSV final belum tersedia." },
      { status: 404 },
    );
  }

  const rows = await prisma.kpiMonthly.findMany({
    where: {
      year: monthKey.year,
      month: monthKey.month,
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
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada data KPI bulanan untuk periode terkunci ini." },
      { status: 404 },
    );
  }

  const periodLabel = formatMonthYear(monthKey.month, monthKey.year);
  const csv = toCsv(
    rows.map((row) => ({
      periode: periodLabel,
      nama: row.user.name,
      email: row.user.email,
      scoreKinerja: row.scoreKinerja,
      scoreDisiplin: row.scoreDisiplin,
      totalScore: row.totalScore,
      statusPeriode: "Final",
      dikunciPada: formatDateTime(lockRow.lockedAt),
      dikunciOleh: lockRow.lockedBy.name,
      emailPengunci: lockRow.lockedBy.email,
      updatedAtKpi: formatDateTime(row.updatedAt),
      createdAtKpi: formatDateTime(row.createdAt),
    })),
  );

  return csvResponse(
    `ops-kpi-final-${monthKey.year}-${`${monthKey.month}`.padStart(2, "0")}.csv`,
    csv,
  );
}
