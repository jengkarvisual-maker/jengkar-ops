import type { ReactNode } from "react";
import { AttendanceStatus } from "@prisma/client";

import {
  checkInAction,
  checkOutAction,
  closeProgressAction,
  createProgressAction,
  markOffAction,
  saveFinanceAction,
  syncCurrentMonthKpiAction,
  updateEmployeeProgressAction,
  updateManagerProgressAction,
} from "@/app/dashboard/actions";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  formatDateTime,
  formatMonthYear,
  formatScore,
} from "@/lib/utils";
import type {
  AdminDashboardData,
  DashboardUser,
  EmployeeDashboardData,
  OwnerDashboardData,
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

function CardSection({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  return (
    <section className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-7">
      <div className="flex flex-col gap-2 border-b border-line/80 pb-5">
        <h2 className="font-serif text-3xl text-foreground">{title}</h2>
        {description ? <p className="text-sm leading-7 text-muted">{description}</p> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function StatCard({ label, value, description, tone = "default" }: { label: string; value: string; description: string; tone?: "default" | "success" | "warning" | "pending" }) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5">
      <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>{label}</div>
      <p className="mt-4 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-line bg-surface px-5 py-10 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted">{description}</p>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "default" | "success" | "warning" | "pending" }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>{label}</span>;
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-surface">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function InputField({ defaultValue, label, name, placeholder, required, type = "text" }: { defaultValue?: string; label: string; name: string; placeholder?: string; required?: boolean; type?: "text" | "date" | "number" }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground placeholder:text-muted/70" defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function SelectField({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: DashboardUser[] }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground" defaultValue={defaultValue} name={name} required>
        <option value="">Pilih karyawan</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ children, disabled, tone = "dark" }: { children: ReactNode; disabled?: boolean; tone?: "dark" | "light" | "danger" | "success" }) {
  const className = tone === "light" ? "border border-line bg-white text-foreground hover:border-accent/25 hover:text-accent" : tone === "danger" ? "bg-warning text-white hover:opacity-90" : tone === "success" ? "bg-success text-white hover:opacity-90" : "bg-foreground text-background hover:bg-foreground/90";
  return <button className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`} disabled={disabled} type="submit">{children}</button>;
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
          <form action={checkInAction}><ActionButton disabled={hasCheckedIn && !isOff}>Check-in</ActionButton></form>
          <form action={checkOutAction}><ActionButton disabled={!hasCheckedIn || hasCheckedOut || isOff} tone="success">Check-out</ActionButton></form>
          <form action={markOffAction}><ActionButton disabled={hasCheckedIn} tone="light">OFF</ActionButton></form>
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

function CreateProgressForm({ teamUsers }: { teamUsers: DashboardUser[] }) {
  return (
    <form action={createProgressAction} className="grid gap-4 rounded-[24px] border border-line bg-surface p-5 lg:grid-cols-4">
      <InputField label="Pekerjaan" name="pekerjaan" placeholder="Contoh: Desain feed promo" required />
      <SelectField label="Nama karyawan" name="userId" options={teamUsers} />
      <InputField label="Tanggal mulai" name="tanggalMulai" required type="date" />
      <InputField label="Target selesai" name="targetSelesai" required type="date" />
      <div className="lg:col-span-4"><ActionButton>Tambah progres</ActionButton></div>
    </form>
  );
}

function ManagerProgressList({ rows, teamUsers }: { rows: ProgressItem[]; teamUsers: DashboardUser[] }) {
  if (rows.length === 0) return <EmptyState description="Belum ada pekerjaan aktif. Tambahkan progres baru dari form di atas untuk mulai memantau tim." title="Belum ada pekerjaan berjalan" />;
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-lg font-semibold text-foreground">{row.pekerjaan}</p><p className="mt-1 text-sm text-muted">PIC: {row.name} • Dibuat {formatDate(row.createdAt)}</p></div>
            <div className="flex flex-wrap gap-2"><StatusChip label={row.isDone ? "Done" : "Ongoing"} tone={row.isDone ? "success" : "pending"} /><StatusChip label={row.closing ? "Closed" : "Aktif"} tone={row.closing ? "success" : "default"} /></div>
          </div>
          <form action={updateManagerProgressAction} className="mt-5 grid gap-4 xl:grid-cols-3">
            <input name="progressId" type="hidden" value={row.id} />
            <InputField defaultValue={row.pekerjaan} label="Pekerjaan" name="pekerjaan" required />
            <SelectField defaultValue={row.userId} label="Karyawan" name="userId" options={teamUsers} />
            <InputField defaultValue={formatDateInput(row.targetSelesai)} label="Target selesai" name="targetSelesai" type="date" />
            <InputField defaultValue={formatDateInput(row.tanggalMulai)} label="Tanggal mulai" name="tanggalMulai" type="date" />
            <InputField defaultValue={formatDateInput(row.tanggalSelesai)} label="Tanggal selesai" name="tanggalSelesai" type="date" />
            <InputField defaultValue={formatDateInput(row.tanggalRevisi)} label="Tanggal revisi" name="tanggalRevisi" type="date" />
            <InputField defaultValue={formatDateInput(row.revisiDone)} label="Revisi done" name="revisiDone" type="date" />
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground"><input defaultChecked={row.isDone} name="isDone" type="checkbox" />Tandai done</label>
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground"><input defaultChecked={row.closing} name="closing" type="checkbox" />Tandai closing</label>
            <div className="flex flex-wrap gap-3 xl:col-span-3"><ActionButton>Simpan perubahan</ActionButton></div>
          </form>
          <form action={closeProgressAction} className="mt-3"><input name="progressId" type="hidden" value={row.id} /><ActionButton tone="success">Closing cepat</ActionButton></form>
        </article>
      ))}
    </div>
  );
}

function EmployeeProgressList({ rows }: { rows: ProgressItem[] }) {
  if (rows.length === 0) return <EmptyState description="Saat admin menambahkan pekerjaan untuk Anda, daftar tugas aktif akan muncul di sini." title="Belum ada tugas aktif" />;
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-lg font-semibold text-foreground">{row.pekerjaan}</p><p className="mt-1 text-sm text-muted">Target {formatDate(row.targetSelesai)} • Mulai {formatDate(row.tanggalMulai)}</p></div>
            <StatusChip label={row.isDone ? "Done" : "Ongoing"} tone={row.isDone ? "success" : "pending"} />
          </div>
          <form action={updateEmployeeProgressAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input name="progressId" type="hidden" value={row.id} />
            <InputField defaultValue={formatDateInput(row.tanggalSelesai)} label="Tanggal selesai" name="tanggalSelesai" type="date" />
            <InputField defaultValue={formatDateInput(row.revisiDone)} label="Revisi done" name="revisiDone" type="date" />
            <div className="md:col-span-2"><ActionButton>Simpan update saya</ActionButton></div>
          </form>
        </article>
      ))}
    </div>
  );
}

function CompletedProgressRecap({ rows, emptyDescription }: { rows: ProgressItem[]; emptyDescription: string }) {
  if (rows.length === 0) return <EmptyState description={emptyDescription} title="Belum ada pekerjaan yang closing" />;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{row.pekerjaan}</p><p className="mt-1 text-sm text-muted">{row.name}</p></div><StatusChip label="Closed" tone="success" /></div>
          <div className="mt-4 space-y-2 text-sm text-muted"><p>Mulai: {formatDate(row.tanggalMulai)}</p><p>Selesai: {formatDate(row.tanggalSelesai)}</p><p>Revisi done: {formatDate(row.revisiDone)}</p></div>
        </article>
      ))}
    </div>
  );
}

function SyncKpiCard() {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5">
      <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">KPI Sync</div>
      <p className="mt-4 text-lg font-semibold text-foreground">Sinkron KPI bulan berjalan</p>
      <p className="mt-2 text-sm leading-7 text-muted">Jalankan ulang perhitungan KPI untuk seluruh user bila Anda baru mengubah banyak data progres atau absensi sekaligus.</p>
      <form action={syncCurrentMonthKpiAction} className="mt-5"><ActionButton>Sinkron sekarang</ActionButton></form>
    </article>
  );
}

function FinanceForm({ data }: { data: OwnerDashboardData }) {
  return (
    <form action={saveFinanceAction} className="grid gap-4 rounded-[24px] border border-line bg-surface p-5 lg:grid-cols-3">
      <InputField defaultValue={String(data.activeFinanceYear)} label="Tahun" name="year" required type="number" />
      <InputField defaultValue={data.finance ? String(data.finance.netProfit) : "0"} label="Net profit" name="netProfit" required type="number" />
      <div className="flex items-end"><ActionButton>Simpan finance</ActionButton></div>
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
        <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">KPI tahunan di bawah 70 tidak memperoleh bonus. KPI 95 ke atas mendapat penyesuaian bonus plus 10 persen.</div>
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

function EmployeeSummary({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.46fr_0.54fr]">
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Penjelasan KPI</div>
        <p className="mt-4 text-sm leading-8 text-muted">{data.narrative}</p>
        <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">KPI bulanan memakai bobot 70 persen kinerja dan 30 persen disiplin. KPI tahunan dihitung dari total KPI bulanan dalam satu tahun dibagi 12.</div>
      </article>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard description="Ringkasan KPI untuk periode bulan berjalan." label="KPI bulanan" tone={(data.monthlyKpi?.totalScore ?? 0) >= 80 ? "success" : "default"} value={data.monthlyKpi ? formatScore(data.monthlyKpi.totalScore) : "-"} />
        <StatCard description="Rata-rata tahunan yang dipakai untuk evaluasi bonus." label="KPI tahunan" tone={(data.yearlyKpi?.avgScore ?? 0) >= 80 ? "success" : "default"} value={data.yearlyKpi ? formatScore(data.yearlyKpi.avgScore) : "-"} />
      </div>
    </div>
  );
}

function OwnerPanel({ data }: { data: OwnerDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard description="Jumlah user aktif di dalam aplikasi KPI." label="Total tim" value={String(data.teamSize)} />
        <StatCard description="Karyawan yang check-in tepat waktu hari ini." label="On time" tone="success" value={String(data.attendanceSummary.onTime)} />
        <StatCard description="Karyawan yang melewati jam check-in 09:00." label="Terlambat" tone="warning" value={String(data.attendanceSummary.late)} />
        <StatCard description="Jumlah pekerjaan yang sudah masuk fase closing." label="Progress selesai" tone="success" value={String(data.completedProgressCount)} />
        <StatCard description="Jumlah pekerjaan aktif yang masih berjalan." label="Progress berjalan" tone="pending" value={String(data.openProgressCount)} />
        <StatCard description="Bonus pool tahunan yang siap didistribusikan." label="Bonus pool" value={data.finance ? formatCurrency(data.finance.bonusPool) : "-"} />
      </section>
      <CardSection title="Aksi owner" description="Owner bisa memperbarui finance tahunan, menjalankan sync KPI, dan menambah pekerjaan baru dari sini.">
        <div className="grid gap-4 xl:grid-cols-[0.6fr_0.4fr]"><div className="space-y-4"><FinanceForm data={data} /><CreateProgressForm teamUsers={data.teamUsers} /></div><SyncKpiCard /></div>
      </CardSection>
      <CardSection title="Overview absensi hari ini" description="Warna hijau menandakan on time, merah untuk terlambat, dan kuning untuk OFF."><AttendanceTable rows={data.attendanceToday} emptyDescription="Data absensi akan muncul di sini setelah tim mulai check-in atau menandai OFF." /></CardSection>
      <CardSection title="Daily progress berjalan" description="Owner dapat mengedit pekerjaan aktif, mengubah PIC, dan melakukan closing bila pekerjaan selesai."><ManagerProgressList rows={data.recentProgress} teamUsers={data.teamUsers} /></CardSection>
      <CardSection title="Completed work recap" description="Rekap pekerjaan yang sudah closing membantu owner melihat deliverable yang benar-benar selesai."><CompletedProgressRecap rows={data.completedProgressRows} emptyDescription="Belum ada item yang closing. Setelah admin atau owner melakukan closing, ringkasan akan tampil di sini." /></CardSection>
      <CardSection title="KPI bulanan tim" description="Owner dapat memantau KPI bulanan seluruh tim dari skor kinerja dan disiplin yang sudah dihitung."><MonthlyKpiTable rows={data.monthlyKpis} emptyDescription="Belum ada KPI bulanan. Jalankan sync KPI setelah data absensi dan progres mulai terisi." /></CardSection>
      <CardSection title="Bonus calculator" description="Simulasi bonus tahunan menggunakan bonus pool perusahaan dan KPI tahunan karyawan yang eligible."><YearlyBonusTable data={data} /></CardSection>
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
      <CardSection title="Tabel daily progress" description="Admin memegang kontrol utama pada tabel progres harian, termasuk assignment, revisi, done, dan closing."><ManagerProgressList rows={data.progressRows} teamUsers={data.teamUsers} /></CardSection>
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
      <CardSection title="Ringkasan KPI pribadi" description="Ringkasan ini membantu karyawan memahami cara KPI dibaca tanpa harus membuka tabel mentah."><EmployeeSummary data={data} /></CardSection>
      <CardSection title="Riwayat absensi pribadi" description="Lima catatan absensi terakhir akan muncul di sini sebagai referensi pola kedisiplinan pribadi."><AttendanceTable rows={data.recentAttendance} emptyDescription="Belum ada riwayat absensi. Setelah mulai check-in, riwayat pribadi akan tampil di sini." /></CardSection>
      <CardSection title="Progres kerja pribadi" description="Karyawan dapat memperbarui tanggal selesai dan revisi done untuk pekerjaan yang menjadi tanggung jawabnya."><EmployeeProgressList rows={data.progressRows} /></CardSection>
    </div>
  );
}

export const DashboardPanels = { Owner: OwnerPanel, Admin: AdminPanel, Employee: EmployeePanel };

