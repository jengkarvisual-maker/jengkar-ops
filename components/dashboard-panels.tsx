import type { ReactNode } from "react";
import { AttendanceStatus } from "@prisma/client";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatScore,
} from "@/lib/utils";
import type {
  AdminDashboardData,
  EmployeeDashboardData,
  OwnerDashboardData,
} from "@/types/dashboard";

function toneClass(tone: "default" | "success" | "warning" | "pending") {
  if (tone === "success") {
    return "border-success/15 bg-success/10 text-success";
  }

  if (tone === "warning") {
    return "border-warning/15 bg-warning/10 text-warning";
  }

  if (tone === "pending") {
    return "border-pending/15 bg-pending/10 text-pending";
  }

  return "border-line bg-white text-foreground";
}

function attendanceTone(status: AttendanceStatus) {
  if (status === AttendanceStatus.ONTIME) {
    return "success" as const;
  }

  if (status === AttendanceStatus.LATE) {
    return "warning" as const;
  }

  return "pending" as const;
}

function attendanceLabel(status: AttendanceStatus) {
  if (status === AttendanceStatus.ONTIME) {
    return "On time";
  }

  if (status === AttendanceStatus.LATE) {
    return "Terlambat";
  }

  return "Off";
}

function CardSection({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
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

function StatCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "success" | "warning" | "pending";
}) {
  return (
    <article className="rounded-[24px] border border-line bg-surface p-5">
      <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>
        {label}
      </div>
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

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "success" | "warning" | "pending";
}) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>
      {label}
    </span>
  );
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-surface">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function AttendanceTable({
  rows,
  emptyDescription,
}: {
  rows: OwnerDashboardData["attendanceToday"] | EmployeeDashboardData["recentAttendance"];
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title="Belum ada data absensi" />;
  }

  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Nama</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Check-in</th>
            <th className="px-4 py-3 font-semibold">Check-out</th>
            <th className="px-4 py-3 font-semibold">Tanggal</th>
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
              <td className="px-4 py-3">
                <StatusChip label={attendanceLabel(row.status)} tone={attendanceTone(row.status)} />
              </td>
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

function ProgressTable({
  rows,
  emptyDescription,
}: {
  rows: OwnerDashboardData["recentProgress"] | AdminDashboardData["progressRows"] | EmployeeDashboardData["progressRows"];
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title="Belum ada progres kerja" />;
  }

  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Pekerjaan</th>
            <th className="px-4 py-3 font-semibold">PIC</th>
            <th className="px-4 py-3 font-semibold">Target</th>
            <th className="px-4 py-3 font-semibold">Mulai</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Closing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line/70" key={row.id}>
              <td className="px-4 py-3 font-medium text-foreground">{row.pekerjaan}</td>
              <td className="px-4 py-3 text-muted">{row.name}</td>
              <td className="px-4 py-3 text-muted">{formatDate(row.targetSelesai)}</td>
              <td className="px-4 py-3 text-muted">{formatDate(row.tanggalMulai)}</td>
              <td className="px-4 py-3">
                <StatusChip label={row.isDone ? "Done" : "Ongoing"} tone={row.isDone ? "success" : "pending"} />
              </td>
              <td className="px-4 py-3">
                <StatusChip label={row.closing ? "Closed" : "Belum"} tone={row.closing ? "success" : "default"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonthlyKpiTable({
  rows,
  emptyDescription,
}: {
  rows: OwnerDashboardData["monthlyKpis"] | AdminDashboardData["monthlyKpis"];
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title="Belum ada KPI bulanan" />;
  }

  return (
    <TableShell>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/80 text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Nama</th>
            <th className="px-4 py-3 font-semibold">Periode</th>
            <th className="px-4 py-3 font-semibold">Kinerja</th>
            <th className="px-4 py-3 font-semibold">Disiplin</th>
            <th className="px-4 py-3 font-semibold">Total</th>
          </tr>
        </thead>
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

function YearlyBonusTable({ data }: { data: OwnerDashboardData }) {
  if (!data.finance) {
    return (
      <EmptyState
        description="Isi data laba bersih perusahaan untuk mulai meninjau bonus pool dan simulasi bonus tahunan."
        title="Data finance tahunan belum tersedia"
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Bonus pool {data.finance.year}
        </div>
        <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(data.finance.bonusPool)}</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          Laba bersih tercatat {formatCurrency(data.finance.netProfit)}. Rumus bonus
          pool memakai 10 persen dari net profit sesuai aturan produk.
        </p>
        <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
          Karyawan dengan KPI tahunan di bawah 70 tidak masuk distribusi bonus.
          Skor 95 ke atas mendapat penyesuaian bonus plus 10 persen.
        </div>
      </article>

      {data.bonusPreview.length === 0 ? (
        <EmptyState
          description="Bonus preview akan tampil setelah KPI tahunan dan data finance tersedia untuk karyawan yang eligible."
          title="Belum ada simulasi bonus individual"
        />
      ) : (
        <TableShell>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/80 text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">KPI Tahunan</th>
                <th className="px-4 py-3 font-semibold">Simulasi Bonus</th>
              </tr>
            </thead>
            <tbody>
              {data.bonusPreview.map((row) => (
                <tr className="border-t border-line/70" key={row.userId}>
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{formatScore(row.avgScore)}</td>
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

function EmployeeSummary({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.46fr_0.54fr]">
      <article className="rounded-[24px] border border-line bg-surface p-5">
        <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Penjelasan KPI
        </div>
        <p className="mt-4 text-sm leading-8 text-muted">{data.narrative}</p>
        <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
          KPI bulanan menggunakan bobot 70 persen kinerja dan 30 persen disiplin.
          KPI tahunan adalah rata-rata KPI bulanan dalam satu tahun.
        </div>
      </article>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          description="Ringkasan KPI untuk periode bulan berjalan."
          label="KPI bulanan"
          tone={(data.monthlyKpi?.totalScore ?? 0) >= 80 ? "success" : "default"}
          value={data.monthlyKpi ? formatScore(data.monthlyKpi.totalScore) : "-"}
        />
        <StatCard
          description="Rata-rata tahunan yang dipakai untuk evaluasi bonus."
          label="KPI tahunan"
          tone={(data.yearlyKpi?.avgScore ?? 0) >= 80 ? "success" : "default"}
          value={data.yearlyKpi ? formatScore(data.yearlyKpi.avgScore) : "-"}
        />
      </div>
    </div>
  );
}

function OwnerPanel({ data }: { data: OwnerDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total tim" value={String(data.teamSize)} description="Jumlah user aktif di dalam pondasi aplikasi KPI." />
        <StatCard label="On time" value={String(data.attendanceSummary.onTime)} description="Karyawan yang check-in tepat waktu hari ini." tone="success" />
        <StatCard label="Terlambat" value={String(data.attendanceSummary.late)} description="Karyawan yang melewati jam check-in 09:00." tone="warning" />
        <StatCard label="Progress selesai" value={String(data.completedProgressCount)} description="Jumlah pekerjaan yang sudah masuk fase closing." tone="success" />
        <StatCard label="Progress berjalan" value={String(data.openProgressCount)} description="Jumlah pekerjaan aktif yang masih berjalan." tone="pending" />
        <StatCard label="Bonus pool" value={data.finance ? formatCurrency(data.finance.bonusPool) : "-"} description="Bonus pool tahunan yang siap didistribusikan." />
      </section>

      <CardSection title="Overview absensi hari ini" description="Warna hijau menandakan on time, merah untuk terlambat, dan kuning untuk OFF.">
        <AttendanceTable rows={data.attendanceToday} emptyDescription="Data absensi akan muncul di sini setelah tim mulai check-in atau menandai OFF." />
      </CardSection>

      <CardSection title="Daily progress terbaru" description="Owner dapat memantau pekerjaan aktif dan item yang sudah ditutup oleh tim admin atau karyawan.">
        <ProgressTable rows={data.recentProgress} emptyDescription="Belum ada pekerjaan yang tercatat. Setelah modul progres dipakai, 10 item terbaru akan tampil di sini." />
      </CardSection>

      <CardSection title="KPI bulanan tim" description="Owner dapat memantau KPI bulanan seluruh tim dari skor kinerja dan disiplin yang sudah dihitung.">
        <MonthlyKpiTable rows={data.monthlyKpis} emptyDescription="Belum ada KPI bulanan. Data akan terisi setelah perhitungan performa dan disiplin berjalan." />
      </CardSection>

      <CardSection title="Bonus calculator foundation" description="Simulasi bonus tahunan menggunakan bonus pool perusahaan dan KPI tahunan karyawan yang eligible.">
        <YearlyBonusTable data={data} />
      </CardSection>
    </div>
  );
}

function AdminPanel({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progress aktif" value={String(data.openProgressCount)} description="Baris progres yang masih aktif dan belum closing." tone="pending" />
        <StatCard label="Progress selesai" value={String(data.completedProgressCount)} description="Baris progres yang sudah masuk completed list." tone="success" />
        <StatCard label="On time" value={String(data.attendanceSummary.onTime)} description="Ringkasan check-in tepat waktu hari ini." tone="success" />
        <StatCard label="Terlambat" value={String(data.attendanceSummary.late)} description="Ringkasan keterlambatan hari ini." tone="warning" />
      </section>

      <CardSection title="Tabel daily progress" description="Admin memegang kontrol utama pada tabel progres harian, termasuk assignment dan closing pekerjaan.">
        <ProgressTable rows={data.progressRows} emptyDescription="Belum ada pekerjaan yang ditugaskan. Tambahkan pekerjaan pertama untuk mulai memonitor target harian tim." />
      </CardSection>

      <CardSection title="KPI bulanan terbaru" description="Admin bisa memakai tabel ini untuk melihat performa terbaru sebelum review dengan owner.">
        <MonthlyKpiTable rows={data.monthlyKpis} emptyDescription="Belum ada perhitungan KPI yang tersimpan untuk ditinjau admin." />
      </CardSection>
    </div>
  );
}

function EmployeePanel({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Status hari ini" value={data.attendanceToday ? attendanceLabel(data.attendanceToday.status) : "Belum check-in"} description="Status absensi Anda untuk hari ini." tone={data.attendanceToday ? attendanceTone(data.attendanceToday.status) : "pending"} />
        <StatCard label="Check-in" value={data.attendanceToday ? formatDateTime(data.attendanceToday.checkIn) : "-"} description="Waktu masuk terakhir yang tercatat hari ini." />
        <StatCard label="Check-out" value={data.attendanceToday ? formatDateTime(data.attendanceToday.checkOut) : "-"} description="Waktu pulang terakhir yang tercatat hari ini." />
      </section>

      <CardSection title="Ringkasan KPI pribadi" description="Ringkasan ini membantu karyawan memahami cara KPI dibaca tanpa harus membuka tabel mentah.">
        <EmployeeSummary data={data} />
      </CardSection>

      <CardSection title="Riwayat absensi pribadi" description="Lima catatan absensi terakhir akan muncul di sini sebagai referensi pola kedisiplinan pribadi.">
        <AttendanceTable rows={data.recentAttendance} emptyDescription="Belum ada riwayat absensi. Setelah mulai check-in, riwayat pribadi akan tampil di sini." />
      </CardSection>

      <CardSection title="Progres kerja pribadi" description="Karyawan hanya perlu fokus memperbarui progres yang terkait dengan dirinya sendiri.">
        <ProgressTable rows={data.progressRows} emptyDescription="Belum ada tugas yang tercatat untuk akun ini. Saat admin menambahkan pekerjaan, daftar akan muncul otomatis." />
      </CardSection>
    </div>
  );
}

export const DashboardPanels = {
  Owner: OwnerPanel,
  Admin: AdminPanel,
  Employee: EmployeePanel,
};
