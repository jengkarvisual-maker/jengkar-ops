import { syncAllKpisForMonth } from "../lib/kpi";

async function main() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error("Tanggal bulan berjalan tidak valid.");
  }

  await syncAllKpisForMonth(year, month);
  console.log(`Synced KPI bulan ${month}/${year}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
