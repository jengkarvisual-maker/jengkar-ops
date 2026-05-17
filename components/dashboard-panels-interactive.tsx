import type { ReactNode } from "react";
import { AttendanceStatus, StopCardStatus } from "@prisma/client";
import Link from "next/link";

import {
  checkInAction,
  checkOutAction,
  createProgressAction,
  type EmployeeAddonMutationRow,
  markOffAction,
  saveFinanceAction,
  submitStopCardAction,
  syncCurrentMonthKpiAction,
  updateStopCardStatusAction,
  updateEmployeeProgressAction,
} from "@/app/dashboard/actions";
import { CompletedProgressRecapClient } from "@/components/completed-progress-recap-client";
import { EmployeeAddonPanelClient } from "@/components/employee-addon-panel-client";
import { LockKpiMonthForm } from "@/components/lock-kpi-month-form";
import { ManagerProgressList, type ManagerProgressItem } from "@/components/manager-progress-list";
import { FormSubmitButton } from "@/components/form-submit-button";
import { OwnerStopCardHideForm } from "@/components/owner-stop-card-hide-form";
import { JOB_OPTIONS } from "@/lib/job-catalog";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  formatDateTime,
  formatHours,
  formatMonthYear,
  formatScore,
  formatTime,
} from "@/lib/utils";
import type {
  AdminDashboardData,
  DashboardUser,
  EmployeeDashboardData,
  OwnerDashboardData,
  OwnerDashboardTab,
  ProgressItem,
} from "@/types/dashboard";

function toneClass(tone: "default" | "success" | "warning" | "pending") {
  if (tone === "success") return "border-success/15 bg-success/10 text-success";
  if (tone === "warning") return "border-warning/15 bg-warning/10 text-warning";
  if (tone === "pending") return "border-pending/15 bg-pending/10 text-pending";
  return "border-line bg-white text-foreground";
}

function attendanceTone(status: AttendanceStatus) {
  if (status === AttendanceStatus.ONTIME) return "success" as const;
  if (status === AttendanceStatus.LATE) return "warning" as const;
  return "pending" as const;
}

function attendanceLabel(status: AttendanceStatus) {
  if (status === AttendanceStatus.ONTIME) return "On time";
  if (status === AttendanceStatus.LATE) return "Terlambat";
  return "Off";
}

function stopCardStatusTone(status: StopCardStatus) {
  if (status === StopCardStatus.DIBACA) return "pending" as const;
  if (status === StopCardStatus.DITINDAKLANJUTI) return "warning" as const;
  if (status === StopCardStatus.SELESAI) return "success" as const;
  return "default" as const;
}

function stopCardStatusLabel(status: StopCardStatus) {
  if (status === StopCardStatus.DIBACA) return "Dibaca";
  if (status === StopCardStatus.DITINDAKLANJUTI) return "Ditindaklanjuti";
  if (status === StopCardStatus.SELESAI) return "Selesai";
  return "Baru";
}

function CardSection({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  return (
    <section className="ui-panel p-5 md:p-6">
      <div className="flex flex-col gap-2 border-b border-line/80 pb-5">
        <h2 className="text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">{title}</h2>
        {description ? <p className="text-sm leading-7 text-muted">{description}</p> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function TitleStatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "pending";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
        tone === "success"
          ? "border-success/15 bg-success/10 text-success"
          : "border-pending/15 bg-pending/10 text-pending"
      }`}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value, description, tone = "default" }: { label: string; value: string; description: string; tone?: "default" | "success" | "warning" | "pending" }) {
  return (
    <article className="ui-card p-4 md:p-5">
      <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>{label}</div>
      <p className="mt-3 text-[2rem] font-extrabold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="ui-surface border-dashed px-5 py-8 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function toIsoDateValue(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

function serializeProgressRows(rows: ProgressItem[]): ManagerProgressItem[] {
  return rows.map((row) => ({
    ...row,
    targetSelesai: toIsoDateValue(row.targetSelesai),
    tanggalMulai: toIsoDateValue(row.tanggalMulai),
    tanggalSelesai: toIsoDateValue(row.tanggalSelesai),
    tanggalRevisi: toIsoDateValue(row.tanggalRevisi),
    revisiDone: toIsoDateValue(row.revisiDone),
    canceledAt: toIsoDateValue(row.canceledAt),
    createdAt: toIsoDateValue(row.createdAt) ?? new Date().toISOString(),
  }));
}

function serializeAddonRows(
  rows: EmployeeDashboardData["addonRows"],
): EmployeeAddonMutationRow[] {
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    addonDate: toIsoDateValue(row.addonDate) ?? new Date().toISOString(),
    addonType: row.addonType,
    addonTypeLabel: row.addonTypeLabel,
    addonQuantity: row.addonQuantity,
    createdAt: toIsoDateValue(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoDateValue(row.updatedAt) ?? new Date().toISOString(),
  }));
}

const OWNER_TAB_ITEMS: Array<{
  key: OwnerDashboardTab;
  label: string;
  description: string;
}> = [
  {
    key: "daily",
    label: "Daily",
    description: "Aksi harian owner, absensi, progress aktif, recap closing, dan STOP CARD.",
  },
  {
    key: "addon",
    label: "Add On",
    description: "Monitoring jam lembur dan pekerjaan add-on tim berdasarkan bulan dan karyawan.",
  },
  {
    key: "kpi",
    label: "KPI",
    description: "Status KPI final, nilai final, KPI tim, bonus, dan simulasi uang per karyawan.",
  },
];

function OwnerDashboardTabField({ value }: { value: OwnerDashboardTab }) {
  return <input name="dashboardTab" type="hidden" value={value} />;
}

function DashboardTabQueryField({ value }: { value: OwnerDashboardTab }) {
  return <input name="tab" type="hidden" value={value} />;
}

function OwnerTabNavigation({ activeTab }: { activeTab: OwnerDashboardTab }) {
  return (
    <div className="ui-panel space-y-2.5 p-4 md:p-5">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max gap-2 rounded-full border border-line bg-[#f7f7f8] p-1">
          {OWNER_TAB_ITEMS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`button-press inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                  isActive
                    ? "bg-foreground text-white shadow-[0_8px_18px_rgba(17,17,17,0.14)]"
                    : "text-foreground/70 hover:text-foreground"
                }`}
                href={`/dashboard?tab=${tab.key}`}
                key={tab.key}
                style={isActive ? { color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" } : undefined}
              >
                <span
                  className={isActive ? "text-white" : undefined}
                  style={isActive ? { color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" } : undefined}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="ui-surface px-4 py-3.5">
        <p className="text-sm font-semibold text-foreground">
          {OWNER_TAB_ITEMS.find((tab) => tab.key === activeTab)?.label}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          {OWNER_TAB_ITEMS.find((tab) => tab.key === activeTab)?.description}
        </p>
      </div>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "default" | "success" | "warning" | "pending" }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>{label}</span>;
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="ui-surface overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function InputField({ defaultValue, label, name, placeholder, required, type = "text" }: { defaultValue?: string; label: string; name: string; placeholder?: string; required?: boolean; type?: "text" | "date" | "number" }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input className="ui-input placeholder:text-muted/70" defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function TextareaField({ defaultValue, label, maxLength = 1000, name, placeholder }: { defaultValue?: string; label: string; maxLength?: number; name: string; placeholder?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea className="ui-textarea placeholder:text-muted/70" defaultValue={defaultValue} maxLength={maxLength} name={name} placeholder={placeholder} />
    </label>
  );
}

function SelectField({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: DashboardUser[] }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select className="ui-select" defaultValue={defaultValue} name={name} required>
        <option value="">Pilih karyawan</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

function MonthSelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: OwnerDashboardData["simulationMonthOptions"] | OwnerDashboardData["lockedKpiMonthOptions"];
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select
        className="ui-select"
        defaultValue={defaultValue}
        name={name}
        required
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function JobSelectField({ defaultValue, label = "Pekerjaan" }: { defaultValue?: string; label?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select className="ui-select" defaultValue={defaultValue} name="pekerjaan" required>
        <option value="">Pilih pekerjaan</option>
        {JOB_OPTIONS.map((option) => (
          <option key={option.name} value={option.name}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  children,
  disabled,
  pendingLabel,
  tone = "dark",
}: {
  children: ReactNode;
  disabled?: boolean;
  pendingLabel?: string;
  tone?: "dark" | "light" | "danger" | "success";
}) {
  const className = tone === "light" ? "ui-button-secondary" : tone === "danger" ? "ui-button-danger" : tone === "success" ? "button-press inline-flex h-11 items-center justify-center rounded-full bg-success px-4 text-sm font-semibold text-white transition hover:opacity-90" : "ui-button-primary";
  return <FormSubmitButton className={`button-press disabled:cursor-not-allowed disabled:opacity-50 ${className}`} disabled={disabled} pendingLabel={pendingLabel}>{children}</FormSubmitButton>;
}

function AttendanceTable({ rows, emptyDescription }: { rows: OwnerDashboardData["attendanceToday"] | EmployeeDashboardData["recentAttendance"]; emptyDescription: string }) {
  if (rows.length === 0) return <EmptyState description={emptyDescription} title="Belum ada data absensi" />;
  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted"><tr><th className="px-4 py-3 font-semibold">Nama</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Check-in</th><th className="px-4 py-3 font-semibold">Check-out</th><th className="px-4 py-3 font-semibold">Tanggal</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line/70" key={row.id}>
              <td className="px-4 py-3"><div><p className="font-semibold text-foreground">{row.name}</p><p className="text-xs text-muted">{row.email}</p></div></td>
              <td className="px-4 py-3"><StatusChip label={attendanceLabel(row.status)} tone={attendanceTone(row.status)} /></td>
              <td className="px-4 py-3 text-muted">{formatDateTime(row.checkIn)}</td>
              <td className="px-4 py-3 text-muted">{formatDateTime(row.checkOut)}</td>
              <td className="px-4 py-3 text-muted">{formatDate(row.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function OvertimeTable({
  rows,
  emptyDescription,
  periodTotalLabel = "Total bulan ini",
}: {
  rows: OwnerDashboardData["overtimeRows"] | EmployeeDashboardData["overtimeRows"];
  emptyDescription: string;
  periodTotalLabel?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title="Belum ada jam lembur" />;
  }

  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Nama</th>
            <th className="px-4 py-3 font-semibold">Tanggal</th>
            <th className="px-4 py-3 font-semibold">Check-out</th>
            <th className="px-4 py-3 font-semibold">Jam lembur</th>
            <th className="px-4 py-3 font-semibold">{periodTotalLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line/70" key={row.attendanceId}>
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground">{row.name}</p>
                  <p className="text-xs text-muted">{row.email}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-muted">{formatDate(row.date)}</td>
              <td className="px-4 py-3 text-muted">{formatTime(row.checkOut)}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{formatHours(row.overtimeHours)}</td>
              <td className="px-4 py-3 text-muted">{formatHours(row.monthTotalHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AddonTable({
  rows,
  emptyDescription,
  periodTotalLabel = "Total bulan ini",
}: {
  rows: OwnerDashboardData["addonRows"] | EmployeeDashboardData["addonRows"];
  emptyDescription: string;
  periodTotalLabel?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title="Belum ada pekerjaan add-on" />;
  }

  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Nama</th>
            <th className="px-4 py-3 font-semibold">Tanggal</th>
            <th className="px-4 py-3 font-semibold">Jenis add-on</th>
            <th className="px-4 py-3 font-semibold">Jumlah</th>
            <th className="px-4 py-3 font-semibold">{periodTotalLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line/70" key={row.id}>
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground">{row.name}</p>
                  <p className="text-xs text-muted">{row.email}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-muted">{formatDate(row.addonDate)}</td>
              <td className="px-4 py-3 text-muted">{row.addonTypeLabel}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{row.addonQuantity}</td>
              <td className="px-4 py-3 text-muted">{row.monthTotalQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringFilterForm({ data }: { data: OwnerDashboardData }) {
  const exportHref = `/api/work-tracking/export?monthKey=${encodeURIComponent(
    data.selectedMonitoringMonthKey,
  )}${data.selectedMonitoringUserId ? `&userId=${encodeURIComponent(data.selectedMonitoringUserId)}` : ""}`;

  return (
    <form
      action="/dashboard"
      className="grid gap-3 rounded-[24px] border border-line bg-surface p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.9fr)_auto] xl:items-end"
    >
      <MonthSelectField
        defaultValue={data.selectedMonitoringMonthKey}
        label="Filter bulan"
        name="trackingMonth"
        options={data.monitoringMonthOptions}
      />
      <label className="space-y-2">
        <span className="text-sm font-semibold text-foreground">Filter karyawan</span>
        <select
          className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground"
          defaultValue={data.selectedMonitoringUserId}
          name="trackingUser"
        >
          <option value="">Semua karyawan</option>
          {data.teamUsers.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-[20px] border border-line bg-white px-4 py-3.5 text-sm leading-6 text-muted">
        <p className="font-semibold text-foreground">{data.selectedMonitoringMonthLabel}</p>
        <p className="mt-1.5">
          {data.selectedMonitoringUserName
            ? `Menampilkan data ${data.selectedMonitoringUserName}.`
            : "Menampilkan semua karyawan pada bulan terpilih."}
        </p>
      </div>
      <div className="flex flex-wrap items-stretch gap-3 sm:items-end xl:justify-end">
        <ActionButton pendingLabel="Memuat..." tone="light">Terapkan filter</ActionButton>
        <a
          className="button-press inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent"
          href={exportHref}
        >
          Export CSV
        </a>
      </div>
      <DashboardTabQueryField value="addon" />
    </form>
  );
}

function MonthlyKpiTable({ rows, emptyDescription }: { rows: OwnerDashboardData["monthlyKpis"] | AdminDashboardData["monthlyKpis"]; emptyDescription: string }) {
  if (rows.length === 0) return <EmptyState description={emptyDescription} title="Belum ada KPI bulanan" />;
  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted"><tr><th className="px-4 py-3 font-semibold">Nama</th><th className="px-4 py-3 font-semibold">Periode</th><th className="px-4 py-3 font-semibold">Kinerja</th><th className="px-4 py-3 font-semibold">Disiplin</th><th className="px-4 py-3 font-semibold">Total</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line/70" key={row.id}>
              <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
              <td className="px-4 py-3 text-muted">{formatMonthYear(row.month, row.year)}</td>
              <td className="px-4 py-3 text-muted">{formatScore(row.scoreKinerja)}</td>
              <td className="px-4 py-3 text-muted">{formatScore(row.scoreDisiplin)}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{formatScore(row.totalScore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function OwnerMonthlyKpiStatus({
  monthOptions,
  selectedMonthKey,
  periodLabel,
  isFinal,
  lock,
}: {
  monthOptions: OwnerDashboardData["kpiMonthOptions"];
  selectedMonthKey: string;
  periodLabel: string;
  isFinal: boolean;
  lock: OwnerDashboardData["selectedKpiMonthLock"];
}) {
  return (
    <div className="mb-4 space-y-3 rounded-[20px] border border-line bg-surface px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-foreground">Periode yang ditampilkan: {periodLabel}</p>
        <TitleStatusChip label={isFinal ? "Final" : "Belum final"} tone={isFinal ? "success" : "pending"} />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)] lg:items-start">
        <div className="space-y-3">
          <form action="/dashboard" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Pilih periode KPI</span>
              <select className="ui-select" defaultValue={selectedMonthKey} name="kpiMonth">
                {monthOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <ActionButton pendingLabel="Memuat..." tone="light">
                Tampilkan periode
              </ActionButton>
            </div>
            <DashboardTabQueryField value="kpi" />
          </form>
          {selectedMonthKey ? (
            <div className="flex flex-wrap items-end gap-3">
              <LockKpiMonthForm disabled={isFinal} kpiMonth={selectedMonthKey} />
            </div>
          ) : null}
        </div>
        <div className="rounded-[20px] border border-line bg-white px-4 py-3.5 text-sm leading-6 text-muted">
          {isFinal && lock ? (
            <>
              <p className="font-semibold text-foreground">KPI periode ini sudah dikunci</p>
              <p className="mt-1.5">
                Dikunci {formatDateTime(lock.lockedAt)} oleh {lock.lockedByName}. Nilai final tidak
                akan berubah otomatis lagi.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">KPI periode ini masih dinamis</p>
              <p className="mt-1.5">
                Nilai masih bisa berubah mengikuti update absensi, progres, dan sync KPI sampai
                owner menguncinya.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AttendanceActions({ data }: { data: EmployeeDashboardData }) {
  const hasCheckedIn = Boolean(data.attendanceToday?.checkIn);
  const hasCheckedOut = Boolean(data.attendanceToday?.checkOut);
  const isOff = data.attendanceToday?.status === AttendanceStatus.OFF;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.42fr_0.58fr]">
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Jadwal hari ini</div>
        <p className="mt-4 text-2xl font-semibold text-foreground">{data.scheduleLabel}</p>
        <p className="mt-2 text-sm leading-7 text-muted">Gunakan tombol di samping untuk mencatat check-in, check-out, atau OFF. Status hari ini ikut mempengaruhi disiplin pada KPI bulanan.</p>
      </article>
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="flex flex-wrap gap-3">
          <form action={checkInAction}><ActionButton disabled={hasCheckedIn && !isOff} pendingLabel="Check-in...">Check-in</ActionButton></form>
          <form action={checkOutAction}><ActionButton disabled={!hasCheckedIn || hasCheckedOut || isOff} pendingLabel="Check-out..." tone="success">Check-out</ActionButton></form>
          <form action={markOffAction}><ActionButton disabled={hasCheckedIn} pendingLabel="Menyimpan..." tone="light">OFF</ActionButton></form>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StatusChip label={data.attendanceToday ? attendanceLabel(data.attendanceToday.status) : "Belum ada status"} tone={data.attendanceToday ? attendanceTone(data.attendanceToday.status) : "pending"} />
          <span className="text-sm text-muted">Check-in: {formatDateTime(data.attendanceToday?.checkIn)}</span>
          <span className="text-sm text-muted">Check-out: {formatDateTime(data.attendanceToday?.checkOut)}</span>
        </div>
      </article>
    </div>
  );
}

function CreateProgressForm({
  teamUsers,
  dashboardTab = "daily",
}: {
  teamUsers: DashboardUser[];
  dashboardTab?: OwnerDashboardTab;
}) {
  return (
    <form action={createProgressAction} className="grid gap-4 rounded-[24px] border border-line bg-surface p-5 lg:grid-cols-4">
      <OwnerDashboardTabField value={dashboardTab} />
      <JobSelectField />
      <SelectField label="Nama karyawan" name="userId" options={teamUsers} />
      <InputField label="Tanggal mulai" name="tanggalMulai" required type="date" />
      <InputField label="Target selesai" name="targetSelesai" required type="date" />
      <div className="lg:col-span-4">
        <TextareaField label="Detail pekerjaan" name="detail" placeholder="Tulis detail singkat, brief, atau catatan khusus pekerjaan ini." />
      </div>
      <div className="lg:col-span-4"><ActionButton pendingLabel="Menambahkan...">Tambah progres</ActionButton></div>
    </form>
  );
}

function EmployeeProgressList({ rows }: { rows: ProgressItem[] }) {
  if (rows.length === 0) return <EmptyState description="Saat admin menambahkan pekerjaan untuk Anda, daftar tugas aktif akan muncul di sini." title="Belum ada tugas aktif" />;
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-lg font-semibold text-foreground">{row.pekerjaan}</p><p className="mt-1 text-sm text-muted">Target {formatDate(row.targetSelesai)} • Mulai {formatDate(row.tanggalMulai)}</p>{row.detail ? <p className="mt-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-7 text-muted">{row.detail}</p> : null}</div>
            <StatusChip label={row.isDone ? "Done" : "Ongoing"} tone={row.isDone ? "success" : "pending"} />
          </div>
          <form action={updateEmployeeProgressAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input name="progressId" type="hidden" value={row.id} />
            <InputField defaultValue={formatDateInput(row.tanggalSelesai)} label="Tanggal selesai" name="tanggalSelesai" type="date" />
            <InputField defaultValue={formatDateInput(row.revisiDone)} label="Revisi done" name="revisiDone" type="date" />
            <div className="md:col-span-2"><ActionButton pendingLabel="Menyimpan...">Simpan update saya</ActionButton></div>
          </form>
        </article>
      ))}
    </div>
  );
}

function CompletedProgressRecap({
  rows,
  emptyDescription,
  allowDelete = false,
}: {
  rows: ProgressItem[];
  emptyDescription: string;
  allowDelete?: boolean;
}) {
  if (rows.length === 0) return <EmptyState description={emptyDescription} title="Belum ada pekerjaan yang closing" />;

  if (allowDelete) {
    return (
      <CompletedProgressRecapClient
        emptyDescription={emptyDescription}
        rows={rows.map((row) => ({
          id: row.id,
          pekerjaan: row.pekerjaan,
          detail: row.detail,
          name: row.name,
          tanggalMulai: toIsoDateValue(row.tanggalMulai),
          tanggalSelesai: toIsoDateValue(row.tanggalSelesai),
          revisiDone: toIsoDateValue(row.revisiDone),
        }))}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{row.pekerjaan}</p><p className="mt-1 text-sm text-muted">{row.name}</p></div><StatusChip label="Closed" tone="success" /></div>
            {row.detail ? <p className="mt-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-7 text-muted">{row.detail}</p> : null}
            <div className="mt-4 space-y-2 text-sm text-muted"><p>Mulai: {formatDate(row.tanggalMulai)}</p><p>Selesai: {formatDate(row.tanggalSelesai)}</p><p>Revisi done: {formatDate(row.revisiDone)}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SyncKpiCard({ dashboardTab = "daily" }: { dashboardTab?: OwnerDashboardTab }) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5">
      <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">KPI Sync</div>
      <p className="mt-4 text-lg font-semibold text-foreground">Sinkron KPI bulan berjalan</p>
      <p className="mt-2 text-sm leading-7 text-muted">Jalankan ulang perhitungan KPI untuk seluruh user bila Anda baru mengubah banyak data progres atau absensi sekaligus.</p>
      <form action={syncCurrentMonthKpiAction} className="mt-5">
        <OwnerDashboardTabField value={dashboardTab} />
        <ActionButton pendingLabel="Menyinkronkan...">Sinkron sekarang</ActionButton>
      </form>
    </article>
  );
}

function FinanceForm({
  data,
  dashboardTab = "daily",
}: {
  data: OwnerDashboardData;
  dashboardTab?: OwnerDashboardTab;
}) {
  return (
    <form action={saveFinanceAction} className="grid gap-4 rounded-[24px] border border-line bg-surface p-5 lg:grid-cols-3">
      <OwnerDashboardTabField value={dashboardTab} />
      <InputField defaultValue={String(data.activeFinanceYear)} label="Tahun" name="year" required type="number" />
      <InputField defaultValue={data.finance ? String(data.finance.netProfit) : "0"} label="Net profit" name="netProfit" required type="number" />
      <div className="flex items-end"><ActionButton pendingLabel="Menyimpan..." >Simpan finance</ActionButton></div>
    </form>
  );
}

function YearlyBonusTable({ data }: { data: OwnerDashboardData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Bonus pool {data.activeFinanceYear}</div>
        <p className="mt-4 text-3xl font-semibold text-foreground">{data.finance ? formatCurrency(data.finance.bonusPool) : "-"}</p>
        <p className="mt-2 text-sm leading-7 text-muted">Laba bersih tahun aktif {data.finance ? formatCurrency(data.finance.netProfit) : "-"}. Bonus pool selalu dihitung sebagai 10 persen dari net profit.</p>
        <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">KPI tahunan di bawah 70 tidak memperoleh bonus. Karyawan yang lolos ambang dibagi proporsional berdasarkan nilai KPI masing-masing.</div>
      </article>
      {data.bonusPreview.length === 0 ? <EmptyState description="Simpan finance tahunan lalu sinkronkan KPI bila perlu. Setelah itu simulasi bonus individual akan muncul di sini." title="Belum ada simulasi bonus individual" /> : (
        <TableShell>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/80 text-muted"><tr><th className="px-4 py-3 font-semibold">Nama</th><th className="px-4 py-3 font-semibold">KPI Tahunan</th><th className="px-4 py-3 font-semibold">Simulasi Bonus</th></tr></thead>
            <tbody>
              {data.bonusPreview.map((row) => (
                <tr className="border-t border-line/70" key={row.userId}><td className="px-4 py-3 font-medium text-foreground">{row.name}</td><td className="px-4 py-3 text-muted">{formatScore(row.avgScore)}</td><td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(row.bonus)}</td></tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </div>
  );
}

function LockedKpiValuesPanel({ data }: { data: OwnerDashboardData }) {
  if (data.lockedKpiMonthOptions.length === 0) {
    return (
      <EmptyState
        title="Belum ada KPI final yang bisa dilihat"
        description="Setelah owner mengunci KPI dari tab KPI dashboard ini, nilai final tiap karyawan akan tampil di sini."
      />
    );
  }

  return (
    <div className="space-y-4">
      <form
        action="/dashboard"
        className="grid gap-3 rounded-[24px] border border-line bg-surface p-4 md:p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.9fr)_auto] lg:items-end"
      >
        <MonthSelectField
          defaultValue={data.selectedLockedKpiMonth?.key}
          label="Periode KPI final"
          name="lockedMonth"
          options={data.lockedKpiMonthOptions}
        />
        <div className="rounded-[20px] border border-line bg-white px-4 py-3.5 text-sm leading-6 text-muted">
          {data.selectedLockedKpiMonth ? (
            <>
              <p className="font-semibold text-foreground">{data.selectedLockedKpiMonth.label}</p>
              <p className="mt-1.5">
                Dikunci {formatDateTime(data.selectedLockedKpiMonth.lockedAt)} oleh{" "}
                {data.selectedLockedKpiMonth.lockedByName}.
              </p>
            </>
          ) : (
            <p>Pilih periode KPI yang sudah dikunci untuk melihat nilai finalnya.</p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <ActionButton pendingLabel="Memuat..." tone="light">Tampilkan KPI final</ActionButton>
          {data.selectedLockedKpiMonth ? (
            <a
              className="button-press inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent"
              href={`/api/kpi-locks/export?monthKey=${encodeURIComponent(data.selectedLockedKpiMonth.key)}`}
            >
              Download CSV final
            </a>
          ) : null}
        </div>
        <DashboardTabQueryField value="kpi" />
      </form>
      <MonthlyKpiTable
        rows={data.selectedLockedMonthlyKpis}
        emptyDescription="Belum ada nilai KPI final yang tersimpan untuk periode terkunci ini."
      />
    </div>
  );
}

function KpiMoneySimulationPanel({ data }: { data: OwnerDashboardData }) {
  if (data.simulationMonthOptions.length === 0) {
    return (
      <EmptyState
        title="Belum ada data KPI untuk simulasi uang"
        description="Setelah KPI bulanan mulai tersimpan, owner bisa membuat simulasi distribusi uang per karyawan dari rentang bulan yang dipilih."
      />
    );
  }

  return (
    <div className="space-y-4">
      <form
        action="/dashboard"
        className="grid gap-3 rounded-[24px] border border-line bg-surface p-4 md:p-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,0.88fr)_minmax(0,1fr)_minmax(280px,1fr)_auto] xl:items-end"
      >
        <MonthSelectField
          defaultValue={data.simulationStartMonthKey}
          label="Bulan awal"
          name="simStart"
          options={data.simulationMonthOptions}
        />
        <MonthSelectField
          defaultValue={data.simulationEndMonthKey}
          label="Bulan akhir"
          name="simEnd"
          options={data.simulationMonthOptions}
        />
        <InputField
          defaultValue={String(data.simulationAmount)}
          label="Total dana simulasi"
          name="simAmount"
          type="number"
        />
        <div className="rounded-[20px] border border-line bg-white px-4 py-3.5 text-sm leading-6 text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-foreground">{data.simulationPeriodLabel}</p>
            <TitleStatusChip
              label={data.simulationIsFullyLocked ? "Final" : "Dinamis"}
              tone={data.simulationIsFullyLocked ? "success" : "pending"}
            />
          </div>
          <p className="mt-1.5">
            Simulasi memakai rata-rata KPI bulanan pada rentang terpilih. KPI di bawah 70 tidak
            menerima pembagian.
          </p>
        </div>
        <div className="flex items-end">
          <ActionButton pendingLabel="Menghitung..." tone="light">Hitung simulasi uang</ActionButton>
        </div>
        <DashboardTabQueryField value="kpi" />
      </form>
      {data.simulationRows.length === 0 ? (
        <EmptyState
          title="Belum ada hasil simulasi"
          description="Pilih rentang bulan dan nominal dana simulasi untuk melihat pembagian uang per karyawan."
        />
      ) : (
        <TableShell>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/80 text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Rata-rata KPI</th>
                <th className="px-4 py-3 font-semibold">Bulan terpakai</th>
                <th className="px-4 py-3 font-semibold">Simulasi uang</th>
              </tr>
            </thead>
            <tbody>
              {data.simulationRows.map((row) => (
                <tr className="border-t border-line/70" key={row.userId}>
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{formatScore(row.averageScore)}</td>
                  <td className="px-4 py-3 text-muted">{row.monthsCount}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(row.bonus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </div>
  );
}

function LockedKpiStatusCard({ rows }: { rows: OwnerDashboardData["lockedKpiMonths"] }) {
  if (rows.length === 0) {
    return (
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-pending/15 bg-pending/10 px-3 py-1 text-xs font-semibold text-pending">
          Belum ada lock KPI
        </div>
        <p className="mt-4 text-lg font-semibold text-foreground">Periode KPI final belum ada</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          Setelah owner mengunci KPI dari tab KPI dashboard ini, periode final akan muncul di sini agar
          mudah dipantau dari dashboard.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-[24px] border border-line bg-surface p-5">
      <div className="inline-flex rounded-full border border-success/15 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
        KPI terkunci
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-[20px] border border-line bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{row.label}</p>
              <span className="inline-flex rounded-full border border-success/15 bg-success/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-success">
                Final
              </span>
            </div>
            <p className="mt-2 text-xs leading-6 text-muted">
              Dikunci {formatDateTime(row.lockedAt)} oleh {row.lockedByName}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function EmployeeSummary({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.46fr_0.54fr]">
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Penjelasan KPI</div>
        <p className="mt-4 text-sm leading-8 text-muted">{data.narrative}</p>
        <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">KPI bulanan memakai bobot 90 persen kinerja berbobot pekerjaan dan 10 persen disiplin. KPI tahunan dihitung dari total KPI bulanan dalam satu tahun dibagi 12.</div>
      </article>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard description="Ringkasan KPI untuk periode bulan berjalan." label="KPI bulanan" tone={(data.monthlyKpi?.totalScore ?? 0) >= 80 ? "success" : "default"} value={data.monthlyKpi ? formatScore(data.monthlyKpi.totalScore) : "-"} />
        <StatCard description="Rata-rata tahunan yang dipakai untuk evaluasi bonus." label="KPI tahunan" tone={(data.yearlyKpi?.avgScore ?? 0) >= 80 ? "success" : "default"} value={data.yearlyKpi ? formatScore(data.yearlyKpi.avgScore) : "-"} />
      </div>
    </div>
  );
}

function EmployeeOvertimePanel({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.38fr_0.62fr]">
        <article className="rounded-[24px] border border-line bg-surface p-5">
          <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Lembur {data.overtimeMonthLabel}
          </div>
          <p className="mt-4 text-3xl font-semibold text-foreground">{formatHours(data.overtimeMonthlyTotalHours)}</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Jam lembur otomatis baru dihitung jika check-out lewat pukul 17.00 WIB. Saat melewati
            jam itu, lembur langsung masuk 1 jam lalu berlanjut proporsional per jam berikutnya.
          </p>
        </article>
        <div className="rounded-[24px] border border-line bg-surface p-5">
          <p className="text-lg font-semibold text-foreground">Riwayat lembur bulan berjalan</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Daftar ini hanya menampilkan hari yang benar-benar memiliki jam lembur.
          </p>
          <div className="mt-4">
            <OvertimeTable
              rows={data.overtimeRows}
              periodTotalLabel="Total bulan ini"
              emptyDescription="Belum ada hari dengan check-out di atas jam 17.00 WIB pada bulan ini."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerWorkTrackingPanel({ data }: { data: OwnerDashboardData }) {
  return (
    <div className="space-y-3">
      <MonitoringFilterForm data={data} />
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[24px] border border-line bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Monitoring jam lembur</p>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                Menampilkan jam check-out dan total lembur sesuai periode bulan yang sedang dipilih.
              </p>
            </div>
            <div className="rounded-full border border-success/15 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              {data.selectedMonitoringTotalLabel} {formatHours(data.overtimeMonthlyTotalHours)}
            </div>
          </div>
          <div className="mt-3.5">
            <OvertimeTable
              rows={data.overtimeRows}
              periodTotalLabel={data.selectedMonitoringTotalLabel}
              emptyDescription="Belum ada data lembur pada periode ini."
            />
          </div>
        </article>

        <article className="rounded-[24px] border border-line bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Monitoring pekerjaan add-on</p>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                Menampilkan jenis add-on, jumlah per hari, dan total add-on untuk periode yang sama.
              </p>
            </div>
            <div className="rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              {data.selectedMonitoringTotalLabel} {data.addonMonthlyTotalQuantity}
            </div>
          </div>
          <div className="mt-3.5">
            <AddonTable
              rows={data.addonRows}
              periodTotalLabel={data.selectedMonitoringTotalLabel}
              emptyDescription="Belum ada input pekerjaan add-on pada periode ini."
            />
          </div>
        </article>
      </div>
    </div>
  );
}

function EmployeeStopCardForm() {
  return (
    <form action={submitStopCardAction} className="grid gap-4 rounded-[24px] border border-line bg-surface p-5">
      <div className="inline-flex w-fit rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        Kirim anonim ke owner
      </div>
      <InputField
        label="Judul STOP CARD"
        name="title"
        placeholder="Contoh: Ada situasi komunikasi yang bikin tidak nyaman"
        required
      />
      <TextareaField
        label="Isi STOP CARD"
        maxLength={3000}
        name="content"
        placeholder="Tulis kejadian, konteks, dan hal yang menurut Anda perlu diketahui owner. Identitas pengirim tidak akan ditampilkan di dashboard owner."
      />
      <div className="rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
        STOP CARD dipakai untuk membantu owner memahami situasi di kantor secara lebih jujur.
        Isi laporan akan tampil anonim di dashboard owner.
      </div>
      <div>
        <ActionButton pendingLabel="Mengirim...">Kirim STOP CARD</ActionButton>
      </div>
    </form>
  );
}

function EmployeeStopCardHistory({ rows }: { rows: EmployeeDashboardData["stopCards"] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Belum ada STOP CARD"
        description="Setelah Anda mengirim STOP CARD, riwayat pribadi dan status tindak lanjutnya akan tampil di sini."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-semibold text-foreground">{row.title}</p>
            <StatusChip label={stopCardStatusLabel(row.status)} tone={stopCardStatusTone(row.status)} />
          </div>
          <p className="mt-4 rounded-2xl border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
            {row.content}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <span>Dikirim {formatDateTime(row.createdAt)}</span>
            <span>Update status {formatDateTime(row.updatedAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function OwnerStopCardList({ rows }: { rows: OwnerDashboardData["stopCards"] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Belum ada STOP CARD masuk"
        description="Saat karyawan mulai mengirim STOP CARD, owner akan melihat isi laporan di sini tanpa identitas pengirim."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                Pengirim anonim
              </div>
              <p className="text-lg font-semibold text-foreground">{row.title}</p>
            </div>
            <StatusChip label={stopCardStatusLabel(row.status)} tone={stopCardStatusTone(row.status)} />
          </div>
          <p className="mt-4 rounded-2xl border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
            {row.content}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <span>Masuk {formatDateTime(row.createdAt)}</span>
            <span>Status terakhir {formatDateTime(row.updatedAt)}</span>
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <form action={updateStopCardStatusAction} className="flex flex-col gap-3 md:flex-row md:items-end">
              <input name="stopCardId" type="hidden" value={row.id} />
              <OwnerDashboardTabField value="daily" />
              <label className="space-y-2 md:min-w-[240px]">
                <span className="text-sm font-semibold text-foreground">Status owner</span>
                <select
                  className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground"
                  defaultValue={row.status}
                  name="status"
                  required
                >
                  <option value={StopCardStatus.BARU}>Baru</option>
                  <option value={StopCardStatus.DIBACA}>Dibaca</option>
                  <option value={StopCardStatus.DITINDAKLANJUTI}>Ditindaklanjuti</option>
                  <option value={StopCardStatus.SELESAI}>Selesai</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <ActionButton pendingLabel="Menyimpan..." tone="light">Simpan status</ActionButton>
              </div>
            </form>
            {row.status === StopCardStatus.SELESAI ? (
              <OwnerStopCardHideForm stopCardId={row.id} />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function OwnerPanel({ data }: { data: OwnerDashboardData }) {
  const isDailyTab = data.activeTab === "daily";
  const isAddonTab = data.activeTab === "addon";
  const isKpiTab = data.activeTab === "kpi";

  return (
    <div className="space-y-5">
      <OwnerTabNavigation activeTab={data.activeTab} />

      {isDailyTab ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard description="Jumlah user aktif di dalam aplikasi KPI." label="Total tim" value={String(data.teamSize)} />
            <StatCard description="Karyawan yang check-in tepat waktu hari ini." label="On time" tone="success" value={String(data.attendanceSummary.onTime)} />
            <StatCard description="Karyawan yang melewati jam check-in 09:00." label="Terlambat" tone="warning" value={String(data.attendanceSummary.late)} />
            <StatCard description="Jumlah pekerjaan aktif yang masih berjalan." label="Progress berjalan" tone="pending" value={String(data.openProgressCount)} />
            <StatCard description="Jumlah pekerjaan yang sudah masuk fase closing." label="Progress selesai" tone="success" value={String(data.completedProgressCount)} />
          </section>

          <CardSection title="Aksi owner" description="Owner bisa memperbarui finance tahunan, menjalankan sync KPI, dan menambah pekerjaan baru dari sini.">
            <div className="grid gap-4 xl:grid-cols-[0.6fr_0.4fr]">
              <div className="space-y-4">
                <FinanceForm dashboardTab="daily" data={data} />
                <CreateProgressForm dashboardTab="daily" teamUsers={data.teamUsers} />
              </div>
              <SyncKpiCard dashboardTab="daily" />
            </div>
          </CardSection>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <CardSection title="Overview absensi hari ini" description="Warna hijau menandakan on time, merah untuk terlambat, dan kuning untuk OFF.">
              <AttendanceTable rows={data.attendanceToday} emptyDescription="Data absensi akan muncul di sini setelah tim mulai check-in atau menandai OFF." />
            </CardSection>
            <CardSection title="STOP CARD masuk" description="Laporan antar karyawan tampil anonim di sini agar owner bisa membaca situasi kantor tanpa melihat identitas pengirim.">
              <OwnerStopCardList rows={data.stopCards} />
            </CardSection>
          </div>

          <CardSection title="Daily progress berjalan" description="Owner dapat mengedit pekerjaan aktif, mengubah PIC, dan melakukan closing bila pekerjaan selesai.">
            <ManagerProgressList dashboardTab="daily" rows={serializeProgressRows(data.recentProgress)} teamUsers={data.teamUsers} />
          </CardSection>

          <CardSection title="Completed work recap" description="Rekap pekerjaan yang sudah closing membantu owner melihat deliverable yang benar-benar selesai.">
            <CompletedProgressRecap allowDelete rows={data.completedProgressRows} emptyDescription="Belum ada item yang closing. Setelah admin atau owner melakukan closing, ringkasan akan tampil di sini." />
          </CardSection>
        </>
      ) : null}

      {isAddonTab ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <StatCard
              description={
                data.selectedMonitoringUserName
                  ? `Akumulasi lembur ${data.selectedMonitoringUserName} pada ${data.selectedMonitoringMonthLabel}.`
                  : `Akumulasi lembur seluruh karyawan pada ${data.selectedMonitoringMonthLabel}.`
              }
              label="Total lembur"
              tone="success"
              value={formatHours(data.overtimeMonthlyTotalHours)}
            />
            <StatCard
              description={
                data.selectedMonitoringUserName
                  ? `Total add-on ${data.selectedMonitoringUserName} pada ${data.selectedMonitoringMonthLabel}.`
                  : `Total add-on seluruh karyawan pada ${data.selectedMonitoringMonthLabel}.`
              }
              label="Total add-on"
              tone="pending"
              value={String(data.addonMonthlyTotalQuantity)}
            />
          </section>

          <CardSection title="Monitoring lembur & pekerjaan add-on" description="Owner bisa memantau jam lembur dan input pekerjaan add-on berdasarkan bulan serta karyawan yang dipilih, lalu mengekspor CSV yang sama persis dengan filter aktif.">
            <OwnerWorkTrackingPanel data={data} />
          </CardSection>
        </>
      ) : null}

      {isKpiTab ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              description={`Status final KPI untuk ${data.monthlyKpiPeriodLabel}.`}
              label="Status KPI"
              tone={data.monthlyKpiIsFinal ? "success" : "pending"}
              value={data.monthlyKpiIsFinal ? "Final" : "Dinamis"}
            />
            <StatCard
              description={`Bonus pool aktif untuk tahun ${data.activeFinanceYear}.`}
              label="Bonus pool"
              value={data.finance ? formatCurrency(data.finance.bonusPool) : "-"}
            />
            <StatCard
              description="Jumlah karyawan yang masuk simulasi bonus tahunan."
              label="Eligible bonus"
              tone="success"
              value={String(data.bonusPreview.length)}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <CardSection title="Status KPI final" description="Periode yang sudah dikunci tampil di sini agar owner cepat mengetahui bulan evaluasi mana yang hasilnya sudah final.">
              <LockedKpiStatusCard rows={data.lockedKpiMonths} />
            </CardSection>
            <CardSection title="Nilai KPI final" description="Panel ini menampilkan nilai KPI yang sudah terkunci agar owner bisa melihat angka final tanpa masuk ke halaman Pengaturan.">
              <LockedKpiValuesPanel data={data} />
            </CardSection>
          </div>

          <CardSection title="KPI bulanan tim" description="Owner dapat memantau KPI bulanan seluruh tim dari skor kinerja dan disiplin yang sudah dihitung.">
            <OwnerMonthlyKpiStatus
              lock={data.selectedKpiMonthLock}
              monthOptions={data.kpiMonthOptions}
              selectedMonthKey={data.selectedKpiMonth?.key ?? ""}
              isFinal={data.monthlyKpiIsFinal}
              periodLabel={data.monthlyKpiPeriodLabel}
            />
            <MonthlyKpiTable rows={data.monthlyKpis} emptyDescription="Belum ada KPI bulanan. Jalankan sync KPI setelah data absensi dan progres mulai terisi." />
          </CardSection>

          <CardSection title="Bonus calculator" description="Simulasi bonus tahunan menggunakan bonus pool perusahaan dan KPI tahunan karyawan yang eligible.">
            <YearlyBonusTable data={data} />
          </CardSection>

          <CardSection title="Simulasi uang per karyawan" description="Owner bisa menguji pembagian uang berdasarkan rata-rata KPI pada rentang bulan yang dipilih, tanpa mengubah data KPI asli.">
            <KpiMoneySimulationPanel data={data} />
          </CardSection>
        </>
      ) : null}
    </div>
  );
}

function AdminPanel({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard description="Baris progres yang masih aktif dan belum closing." label="Progress aktif" tone="pending" value={String(data.openProgressCount)} />
        <StatCard description="Baris progres yang sudah masuk completed list." label="Progress selesai" tone="success" value={String(data.completedProgressCount)} />
        <StatCard description="Ringkasan check-in tepat waktu hari ini." label="On time" tone="success" value={String(data.attendanceSummary.onTime)} />
        <StatCard description="Ringkasan keterlambatan hari ini." label="Terlambat" tone="warning" value={String(data.attendanceSummary.late)} />
      </section>
      <CardSection title="Aksi admin" description="Admin dapat menambahkan pekerjaan baru dan menjalankan ulang sinkron KPI bila ada banyak update."><div className="grid gap-4 xl:grid-cols-[0.65fr_0.35fr]"><CreateProgressForm teamUsers={data.teamUsers} /><SyncKpiCard /></div></CardSection>
      <CardSection title="Tabel daily progress" description="Admin memegang kontrol utama pada tabel progres harian, termasuk assignment, revisi, done, dan closing."><ManagerProgressList rows={serializeProgressRows(data.progressRows)} teamUsers={data.teamUsers} /></CardSection>
      <CardSection title="Completed list" description="Ringkasan pekerjaan yang sudah closing membantu admin mengecek backlog yang benar-benar selesai."><CompletedProgressRecap rows={data.completedProgressRows} emptyDescription="Belum ada pekerjaan yang dipindahkan ke completed list." /></CardSection>
      <CardSection title="KPI bulanan terbaru" description="Admin bisa memakai tabel ini untuk melihat performa terbaru sebelum review dengan owner."><MonthlyKpiTable rows={data.monthlyKpis} emptyDescription="Belum ada perhitungan KPI yang tersimpan untuk ditinjau admin." /></CardSection>
    </div>
  );
}

function EmployeePanel({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard description="Status absensi Anda untuk hari ini." label="Status hari ini" tone={data.attendanceToday ? attendanceTone(data.attendanceToday.status) : "pending"} value={data.attendanceToday ? attendanceLabel(data.attendanceToday.status) : "Belum check-in"} />
        <StatCard description="Waktu masuk terakhir yang tercatat hari ini." label="Check-in" value={data.attendanceToday ? formatDateTime(data.attendanceToday.checkIn) : "-"} />
        <StatCard description="Waktu pulang terakhir yang tercatat hari ini." label="Check-out" value={data.attendanceToday ? formatDateTime(data.attendanceToday.checkOut) : "-"} />
      </section>
      <CardSection title="Attendance system" description="Bagian ini adalah pusat absensi pribadi Anda untuk hari berjalan."><AttendanceActions data={data} /></CardSection>
      <CardSection title="Jam lembur otomatis" description="Jam lembur baru dihitung jika check-out lewat pukul 17.00 WIB, lalu diringkas per bulan berjalan.">
        <EmployeeOvertimePanel data={data} />
      </CardSection>
      <CardSection title="Pekerjaan add-on" description="Karyawan bisa mencatat jumlah pekerjaan add-on harian, lalu melihat riwayat bulan berjalan tanpa membuka halaman lain.">
        <EmployeeAddonPanelClient
          initialRows={serializeAddonRows(data.addonRows)}
          initialTotalQuantity={data.addonMonthlyTotalQuantity}
          monthLabel={data.addonMonthLabel}
        />
      </CardSection>
      <CardSection title="STOP CARD" description="Gunakan ruang ini untuk menceritakan situasi yang terjadi di kantor. Owner akan membaca isi laporan tanpa melihat identitas pengirim.">
        <div className="grid gap-4 xl:grid-cols-[0.44fr_0.56fr]">
          <EmployeeStopCardForm />
          <EmployeeStopCardHistory rows={data.stopCards} />
        </div>
      </CardSection>
      <CardSection title="Ringkasan KPI pribadi" description="Ringkasan ini membantu karyawan memahami cara KPI dibaca tanpa harus membuka tabel mentah."><EmployeeSummary data={data} /></CardSection>
      <CardSection title="Riwayat absensi pribadi" description="Tujuh catatan absensi terakhir akan muncul di sini sebagai referensi pola kedisiplinan pribadi."><AttendanceTable rows={data.recentAttendance} emptyDescription="Belum ada riwayat absensi. Setelah mulai check-in, riwayat pribadi akan tampil di sini." /></CardSection>
      <CardSection title="Progres kerja pribadi" description="Karyawan dapat memperbarui tanggal selesai dan revisi done untuk pekerjaan yang menjadi tanggung jawabnya."><EmployeeProgressList rows={data.progressRows} /></CardSection>
    </div>
  );
}

export const DashboardPanels = { Owner: OwnerPanel, Admin: AdminPanel, Employee: EmployeePanel };
