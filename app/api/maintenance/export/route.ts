import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { addDays, formatDateInput, formatDateTime, parseDateInput } from "@/lib/utils";

function buildDateRange(fromRaw: string | null, toRaw: string | null) {
  const fromDate = parseDateInput(fromRaw);
  const toDate = parseDateInput(toRaw);

  if (!fromDate || !toDate) {
    return null;
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return null;
  }

  return {
    fromDate,
    toDate,
    toExclusive: addDays(toDate, 1),
  };
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
  const dataset = searchParams.get("dataset");
  const range = buildDateRange(searchParams.get("from"), searchParams.get("to"));

  if (!range) {
    return NextResponse.json({ message: "Rentang tanggal belum valid." }, { status: 400 });
  }

  const periodLabel = `${formatDateInput(range.fromDate)}_${formatDateInput(range.toDate)}`;

  if (dataset === "attendance") {
    const rows = await prisma.attendance.findMany({
      where: {
        date: {
          gte: range.fromDate,
          lt: range.toExclusive,
        },
      },
      include: {
        user: true,
      },
      orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
    });

    if (rows.length === 0) {
      return NextResponse.json({ message: "Tidak ada data absensi pada periode ini." }, { status: 404 });
    }

    const csv = toCsv(
      rows.map((row) => ({
        tanggal: formatDateInput(row.date),
        nama: row.user.name,
        email: row.user.email,
        status: row.status,
        checkIn: formatDateTime(row.checkIn),
        checkOut: formatDateTime(row.checkOut),
        dibuatPada: formatDateTime(row.createdAt),
      })),
    );

    return csvResponse(`ops-attendance-${periodLabel}.csv`, csv);
  }

  if (dataset === "hidden-progress") {
    const rows = await prisma.dailyProgress.findMany({
      where: {
        closing: true,
        hiddenFromDashboard: true,
        OR: [
          {
            tanggalSelesai: {
              gte: range.fromDate,
              lt: range.toExclusive,
            },
          },
          {
            AND: [
              { tanggalSelesai: null },
              {
                createdAt: {
                  gte: range.fromDate,
                  lt: range.toExclusive,
                },
              },
            ],
          },
        ],
      },
      include: {
        user: true,
      },
      orderBy: [{ createdAt: "desc" }, { user: { name: "asc" } }],
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Tidak ada progress closing tersembunyi pada periode ini." },
        { status: 404 },
      );
    }

    const csv = toCsv(
      rows.map((row) => ({
        pekerjaan: row.pekerjaan,
        nama: row.user.name,
        email: row.user.email,
        targetSelesai: formatDateInput(row.targetSelesai),
        tanggalMulai: formatDateInput(row.tanggalMulai),
        tanggalSelesai: formatDateInput(row.tanggalSelesai),
        tanggalRevisi: formatDateInput(row.tanggalRevisi),
        revisiDone: formatDateInput(row.revisiDone),
        isDone: row.isDone ? "Ya" : "Tidak",
        closing: row.closing ? "Ya" : "Tidak",
        hiddenFromDashboard: row.hiddenFromDashboard ? "Ya" : "Tidak",
        dibuatPada: formatDateTime(row.createdAt),
      })),
    );

    return csvResponse(`ops-hidden-progress-${periodLabel}.csv`, csv);
  }

  return NextResponse.json({ message: "Dataset maintenance tidak dikenali." }, { status: 400 });
}
