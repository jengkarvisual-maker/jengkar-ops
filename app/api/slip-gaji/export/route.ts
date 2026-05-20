import { UserRole } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getCurrentUserProfile } from "@/lib/auth";
import { getOwnerSlipGajiData } from "@/lib/slip-gaji";
import { formatCurrency, formatDate, formatHours, formatScore } from "@/lib/utils";

export const runtime = "nodejs";

type ExportPayload = {
  userId?: string;
  monthKey?: string;
  baseSalary?: number | string | null;
  overtimeRate?: number | string | null;
  addonPrices?: Record<string, number | string | null | undefined>;
};

function parseMoneyValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  const normalized = String(value ?? "").replace(/[^\d]/g, "");

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatPrintDate(value = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function drawText(
  page: import("pdf-lib").PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: import("pdf-lib").PDFFont,
  color = rgb(0.07, 0.07, 0.07),
) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawRule(page: import("pdf-lib").PDFPage, y: number) {
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1,
    color: rgb(0.88, 0.88, 0.9),
  });
}

function drawSummaryRow(
  page: import("pdf-lib").PDFPage,
  label: string,
  value: string,
  y: number,
  font: import("pdf-lib").PDFFont,
  boldFont: import("pdf-lib").PDFFont,
  strong = false,
) {
  drawText(page, label, 52, y, strong ? 10 : 9.5, strong ? boldFont : font);
  const rightWidth = (strong ? boldFont : font).widthOfTextAtSize(value, strong ? 10 : 9.5);
  drawText(page, value, 543 - rightWidth, y, strong ? 10 : 9.5, strong ? boldFont : font);
}

async function loadLogo() {
  try {
    const filePath = path.join(process.cwd(), "public", "rumah-jengkar-logo.png");
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUserProfile();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== UserRole.OWNER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as ExportPayload | null;
  const selectedUserId = payload?.userId?.trim() ?? "";
  const selectedMonthKey = payload?.monthKey?.trim() ?? "";

  if (!selectedUserId) {
    return NextResponse.json({ message: "Nama karyawan belum dipilih." }, { status: 400 });
  }

  if (!selectedMonthKey) {
    return NextResponse.json({ message: "Bulan belum dipilih." }, { status: 400 });
  }

  const slipData = await getOwnerSlipGajiData({
    userId: selectedUserId,
    monthKey: selectedMonthKey,
  });

  if (!slipData.selectedUserId || !slipData.selectedUserName) {
    return NextResponse.json({ message: "Karyawan tidak ditemukan." }, { status: 404 });
  }

  const baseSalary = parseMoneyValue(payload?.baseSalary);
  const overtimeRate = parseMoneyValue(payload?.overtimeRate);
  const addonPrices = payload?.addonPrices ?? {};
  const addonRows = slipData.addonItems.map((item) => {
    const price = parseMoneyValue(addonPrices[item.addonType]);

    return {
      ...item,
      price,
      total: item.quantity * price,
    };
  });
  const totalOvertimePay = slipData.overtimeTotalHours * overtimeRate;
  const totalAddonPay = addonRows.reduce((sum, row) => sum + row.total, 0);
  const totalReceived = baseSalary + totalOvertimePay + totalAddonPay + slipData.bonusKpi;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await loadLogo();

  if (logoBytes) {
    try {
      const image = await pdf.embedPng(logoBytes);
      const scaled = image.scale(0.18);

      page.drawImage(image, {
        x: 42,
        y: 764,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      drawText(page, "Rumah Jengkar", 42, 790, 15, boldFont);
    }
  } else {
    drawText(page, "Rumah Jengkar", 42, 790, 15, boldFont);
  }

  drawText(page, "SLIP GAJI", 420, 790, 18, boldFont);
  drawText(page, `Tanggal cetak: ${formatPrintDate()}`, 388, 772, 9, font, rgb(0.35, 0.35, 0.38));
  drawRule(page, 752);

  drawText(page, "Identitas", 42, 730, 10.5, boldFont);
  drawText(page, `Nama Karyawan: ${slipData.selectedUserName}`, 42, 712, 9.5, font);
  drawText(page, `Bulan: ${slipData.selectedMonthLabel}`, 320, 712, 9.5, font);

  drawText(page, "Breakdown Gaji", 42, 684, 10.5, boldFont);
  drawSummaryRow(page, "Gaji Pokok", formatCurrency(baseSalary), 664, font, boldFont);
  drawSummaryRow(page, "Total Uang Lembur", formatCurrency(totalOvertimePay), 648, font, boldFont);
  drawSummaryRow(page, "Total Uang Pekerjaan Add-on", formatCurrency(totalAddonPay), 632, font, boldFont);
  drawSummaryRow(page, "Bonus KPI", formatCurrency(slipData.bonusKpi), 616, font, boldFont);
  drawSummaryRow(page, "Total Diterima", formatCurrency(totalReceived), 598, font, boldFont, true);
  drawRule(page, 588);

  drawText(page, "Detail Lembur", 42, 566, 10.5, boldFont);
  drawSummaryRow(page, "Total jam lembur", formatHours(slipData.overtimeTotalHours), 548, font, boldFont);
  drawSummaryRow(page, "Harga lembur per jam", formatCurrency(overtimeRate), 532, font, boldFont);
  drawSummaryRow(page, "Total uang lembur", formatCurrency(totalOvertimePay), 516, font, boldFont);

  drawText(page, "Detail Pekerjaan Add-on", 310, 566, 10.5, boldFont);
  if (addonRows.length === 0) {
    drawText(page, "Tidak ada pekerjaan add-on pada periode ini.", 310, 548, 9.5, font, rgb(0.35, 0.35, 0.38));
  } else {
    let addonY = 548;

    addonRows.slice(0, 6).forEach((row) => {
      const label = `${row.addonTypeLabel} | Qty ${row.quantity}`;
      const middle = `${formatCurrency(row.price)}`;
      const total = formatCurrency(row.total);
      const middleWidth = font.widthOfTextAtSize(middle, 8.8);
      const totalWidth = boldFont.widthOfTextAtSize(total, 8.8);

      drawText(page, label, 310, addonY, 8.8, font);
      drawText(page, middle, 470 - middleWidth, addonY, 8.8, font, rgb(0.35, 0.35, 0.38));
      drawText(page, total, 545 - totalWidth, addonY, 8.8, boldFont);
      addonY -= 14;
    });
  }

  drawRule(page, 468);

  drawText(page, "Bonus KPI", 42, 446, 10.5, boldFont);
  drawSummaryRow(page, "Nilai bonus", formatCurrency(slipData.bonusKpi), 428, font, boldFont);
  drawText(
    page,
    slipData.bonusKpiMessage ?? "Bonus KPI mengikuti logic simulasi uang karyawan untuk bulan terpilih.",
    42,
    412,
    8.8,
    font,
    rgb(0.35, 0.35, 0.38),
  );

  drawText(page, "Rekap Absensi", 310, 446, 10.5, boldFont);
  drawSummaryRow(page, "Check in tepat waktu", `${slipData.attendanceRecap.onTime} kali`, 428, font, boldFont);
  drawSummaryRow(page, "Check in terlambat", `${slipData.attendanceRecap.late} kali`, 412, font, boldFont);
  drawSummaryRow(
    page,
    "Check out di atas jam 17.00",
    `${slipData.attendanceRecap.checkoutAfterFive} kali`,
    396,
    font,
    boldFont,
  );

  drawRule(page, 376);

  drawText(page, "KPI", 42, 354, 10.5, boldFont);
  drawSummaryRow(
    page,
    `Nilai KPI ${slipData.selectedMonthLabel}`,
    slipData.monthlyKpi ? formatScore(slipData.monthlyKpi.totalScore) : "Belum tersedia",
    336,
    font,
    boldFont,
  );
  drawSummaryRow(
    page,
    "Nilai rata-rata KPI karyawan",
    slipData.averageKpi !== null ? formatScore(slipData.averageKpi) : "Belum tersedia",
    320,
    font,
    boldFont,
  );

  drawRule(page, 286);

  drawText(page, "Naila Salamah", 72, 178, 10, boldFont);
  drawText(page, "Finance", 72, 162, 9, font, rgb(0.35, 0.35, 0.38));
  page.drawLine({
    start: { x: 72, y: 205 },
    end: { x: 230, y: 205 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.72),
  });

  drawText(page, "Irawan Gepy Kristianto", 336, 178, 10, boldFont);
  drawText(page, "Owner", 336, 162, 9, font, rgb(0.35, 0.35, 0.38));
  page.drawLine({
    start: { x: 336, y: 205 },
    end: { x: 522, y: 205 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.72),
  });

  drawText(page, "Rumah Jengkar", 42, 104, 8.5, boldFont, rgb(0.35, 0.35, 0.38));
  drawText(page, `Data dibaca dari sistem OPS pada ${formatDate(new Date())}`, 42, 90, 8.5, font, rgb(0.5, 0.5, 0.54));

  const bytes = await pdf.save();
  const fileName = `slip-gaji-${slipData.selectedUserName.replace(/\s+/g, "-").toLowerCase()}-${selectedMonthKey}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
