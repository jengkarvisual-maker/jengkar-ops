"use client";

import { useMemo, useState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import { formatCurrency, formatHours, formatScore } from "@/lib/utils";
import type { DashboardUser, SlipGajiData } from "@/types/dashboard";

type SlipGajiPanelClientProps = {
  teamUsers: DashboardUser[];
  data: SlipGajiData;
};

function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^\d]/g, "");

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="ui-surface border-dashed px-5 py-8 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line/70 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className={strong ? "text-sm font-semibold text-foreground" : "text-sm text-muted"}>{label}</span>
      <span className={strong ? "text-sm font-semibold text-foreground" : "text-sm text-foreground"}>{value}</span>
    </div>
  );
}

function MoneyField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input
        className="ui-input"
        inputMode="numeric"
        onChange={(event) => onChange(parseMoneyInput(event.currentTarget.value))}
        placeholder="0"
        type="text"
        value={value > 0 ? String(value) : ""}
      />
      <p className="text-xs text-muted">{helper ?? formatCurrency(value)}</p>
    </label>
  );
}

export function SlipGajiPanelClient({ teamUsers, data }: SlipGajiPanelClientProps) {
  const [baseSalary, setBaseSalary] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(0);
  const [addonPriceMap, setAddonPriceMap] = useState<Record<string, number>>(
    Object.fromEntries(data.addonItems.map((item) => [item.addonType, 0])),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const totalOvertimePay = useMemo(
    () => data.overtimeTotalHours * overtimeRate,
    [data.overtimeTotalHours, overtimeRate],
  );

  const addonRows = useMemo(
    () =>
      data.addonItems.map((item) => {
        const price = addonPriceMap[item.addonType] ?? 0;
        return {
          ...item,
          price,
          total: item.quantity * price,
        };
      }),
    [addonPriceMap, data.addonItems],
  );

  const totalAddonPay = useMemo(
    () => addonRows.reduce((sum, item) => sum + item.total, 0),
    [addonRows],
  );

  const totalReceived = useMemo(
    () => baseSalary + totalOvertimePay + totalAddonPay + data.bonusKpi,
    [baseSalary, totalOvertimePay, totalAddonPay, data.bonusKpi],
  );

  const canExport = Boolean(data.selectedUserId && data.selectedMonthKey && !isExporting);

  async function handleExportPdf() {
    if (!canExport) {
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/slip-gaji/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: data.selectedUserId,
          monthKey: data.selectedMonthKey,
          baseSalary,
          overtimeRate,
          addonPrices: Object.fromEntries(addonRows.map((row) => [row.addonType, row.price])),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Export PDF gagal dibuat.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `slip-gaji-${data.selectedUserName?.replace(/\s+/g, "-").toLowerCase() ?? "karyawan"}-${data.selectedMonthKey}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export PDF gagal dibuat.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <form action="/dashboard" className="grid gap-3 rounded-[24px] border border-line bg-surface p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_auto] xl:items-end">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Nama karyawan</span>
          <select className="ui-select" defaultValue={data.selectedUserId} name="slipUser">
            <option value="">Pilih karyawan</option>
            {teamUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Bulan</span>
          <select className="ui-select" defaultValue={data.selectedMonthKey} name="slipMonth">
            {data.monthOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <FormSubmitButton className="ui-button-secondary button-press" pendingLabel="Memuat...">
            Terapkan
          </FormSubmitButton>
        </div>
        <input name="tab" type="hidden" value="slip" />
      </form>

      {!data.selectedUserId ? (
        <EmptyState
          title="Pilih karyawan terlebih dahulu"
          description="Setelah karyawan dipilih, sistem akan menampilkan data absensi, lembur, add-on, KPI, bonus KPI, dan ringkasan gaji untuk bulan yang dipilih."
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <article className="ui-card p-4 md:p-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Gaji Pokok</p>
                <p className="text-sm leading-6 text-muted">
                  Isi nominal gaji pokok manual. Jika kosong, sistem membaca Rp0.
                </p>
              </div>
              <div className="mt-4">
                <MoneyField label="Nominal gaji pokok" value={baseSalary} onChange={setBaseSalary} />
              </div>
            </article>

            <article className="ui-card p-4 md:p-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Uang Lembur</p>
                <p className="text-sm leading-6 text-muted">
                  Total jam lembur diambil dari data absensi existing pada {data.selectedMonthLabel}.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Total jam lembur" value={formatHours(data.overtimeTotalHours)} />
                <MoneyField
                  helper={`Total otomatis: ${formatCurrency(totalOvertimePay)}`}
                  label="Harga lembur per jam"
                  value={overtimeRate}
                  onChange={setOvertimeRate}
                />
                <SummaryRow label="Total uang lembur" strong value={formatCurrency(totalOvertimePay)} />
              </div>
            </article>

            <article className="ui-card p-4 md:p-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Bonus KPI</p>
                <p className="text-sm leading-6 text-muted">
                  Bonus memakai logic yang sama dengan simulasi uang per karyawan pada periode bulan terpilih.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Bonus KPI" strong value={formatCurrency(data.bonusKpi)} />
                <SummaryRow
                  label="Bonus pool acuan"
                  value={data.financeBonusPool > 0 ? formatCurrency(data.financeBonusPool) : "Rp0"}
                />
                {data.bonusKpiMessage ? (
                  <p className="rounded-[18px] border border-line bg-white px-4 py-3 text-sm leading-6 text-muted">
                    {data.bonusKpiMessage}
                  </p>
                ) : null}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="ui-panel p-5 md:p-6">
              <div className="border-b border-line/80 pb-5">
                <h2 className="text-[1.4rem] font-extrabold tracking-[-0.03em] text-foreground">Uang Pekerjaan Add-on</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Daftar di bawah hanya membaca add-on existing milik {data.selectedUserName} pada {data.selectedMonthLabel}.
                </p>
              </div>
              <div className="pt-5">
                {addonRows.length === 0 ? (
                  <EmptyState
                    description="Karyawan ini belum memiliki pekerjaan add-on pada periode yang dipilih."
                    title="Belum ada pekerjaan add-on"
                  />
                ) : (
                  <div className="space-y-4">
                    {addonRows.map((item) => (
                      <div
                        className="grid gap-3 rounded-[20px] border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,0.95fr)_160px] md:items-end"
                        key={item.addonType}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.addonTypeLabel}</p>
                          <p className="mt-1 text-xs text-muted">Qty: {item.quantity}</p>
                        </div>
                        <div className="rounded-[18px] border border-line bg-white px-3 py-3 text-sm text-foreground">
                          Qty {item.quantity}
                        </div>
                        <MoneyField
                          helper={`Harga/item ${formatCurrency(item.price)}`}
                          label="Harga per item"
                          onChange={(value) =>
                            setAddonPriceMap((previous) => ({
                              ...previous,
                              [item.addonType]: value,
                            }))
                          }
                          value={item.price}
                        />
                        <div className="rounded-[18px] border border-line bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Total</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(item.total)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-[22px] border border-line bg-white px-4 py-4">
                      <SummaryRow label="Total uang add-on" strong value={formatCurrency(totalAddonPay)} />
                    </div>
                  </div>
                )}
              </div>
            </article>

            <div className="space-y-4">
              <article className="ui-card p-4 md:p-5">
                <h2 className="text-lg font-semibold text-foreground">Rekap Absensi Bulanan</h2>
                <div className="mt-4 space-y-2">
                  <SummaryRow label="Check in tepat waktu" value={`${data.attendanceRecap.onTime} kali`} />
                  <SummaryRow label="Check in terlambat" value={`${data.attendanceRecap.late} kali`} />
                  <SummaryRow
                    label="Check out di atas jam 17.00"
                    value={`${data.attendanceRecap.checkoutAfterFive} kali`}
                  />
                </div>
              </article>

              <article className="ui-card p-4 md:p-5">
                <h2 className="text-lg font-semibold text-foreground">KPI Karyawan</h2>
                <div className="mt-4 space-y-2">
                  <SummaryRow
                    label={`Nilai KPI ${data.selectedMonthLabel}`}
                    value={data.monthlyKpi ? formatScore(data.monthlyKpi.totalScore) : "Belum tersedia"}
                  />
                  <SummaryRow
                    label="Nilai rata-rata KPI"
                    value={data.averageKpi !== null ? formatScore(data.averageKpi) : "Belum tersedia"}
                  />
                </div>
              </article>

              <article className="ui-panel p-5 md:p-6">
                <div className="border-b border-line/80 pb-5">
                  <h2 className="text-[1.4rem] font-extrabold tracking-[-0.03em] text-foreground">Ringkasan Total Gaji</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Ringkasan ini akan dipakai juga saat export slip gaji PDF.
                  </p>
                </div>
                <div className="space-y-2 pt-5">
                  <SummaryRow label="Gaji Pokok" value={formatCurrency(baseSalary)} />
                  <SummaryRow label="Total Uang Lembur" value={formatCurrency(totalOvertimePay)} />
                  <SummaryRow label="Total Uang Pekerjaan Add-on" value={formatCurrency(totalAddonPay)} />
                  <SummaryRow label="Bonus KPI" value={formatCurrency(data.bonusKpi)} />
                  <SummaryRow label="Total Diterima" strong value={formatCurrency(totalReceived)} />
                </div>
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    className="ui-button-primary button-press disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canExport}
                    onClick={handleExportPdf}
                    type="button"
                  >
                    {isExporting ? "Membuat PDF..." : "Export Slip Gaji PDF"}
                  </button>
                  {!data.selectedMonthKey || !data.selectedUserId ? (
                    <p className="text-xs text-warning">
                      Pilih nama karyawan dan bulan terlebih dahulu sebelum export.
                    </p>
                  ) : null}
                  {exportError ? <p className="text-xs text-warning">{exportError}</p> : null}
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
