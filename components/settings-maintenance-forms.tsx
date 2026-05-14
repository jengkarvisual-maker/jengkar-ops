"use client";

import { useActionState, useState, type ReactNode } from "react";

import {
  attendanceMaintenanceAction,
  hiddenProgressMaintenanceAction,
  type MaintenanceActionState,
} from "@/app/settings/actions";

const initialMaintenanceState: MaintenanceActionState = {
  error: null,
  success: null,
  preview: null,
};

type MaintenanceFormCardProps = {
  action: (
    state: MaintenanceActionState,
    formData: FormData,
  ) => Promise<MaintenanceActionState>;
  children?: ReactNode;
  description: string;
  exportDataset: string;
  helper: string;
  title: string;
};

function MaintenanceFormCard({
  action,
  children,
  description,
  exportDataset,
  helper,
  title,
}: MaintenanceFormCardProps) {
  const [state, formAction, isPending] = useActionState(action, initialMaintenanceState);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const canExport = Boolean(fromDate && toDate) && !isPending;

  function handleExport() {
    if (!canExport) {
      return;
    }

    const params = new URLSearchParams({
      dataset: exportDataset,
      from: fromDate,
      to: toDate,
    });

    window.open(`/api/maintenance/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form action={formAction} className="space-y-5 rounded-[24px] border border-line bg-surface p-5">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-7 text-muted">{description}</p>
      </div>

      {children}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Tanggal mulai</span>
          <input
            className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground"
            disabled={isPending}
            name="fromDate"
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            value={fromDate}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Tanggal akhir</span>
          <input
            className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground"
            disabled={isPending}
            name="toDate"
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            value={toDate}
          />
        </label>
      </div>

      <div className="rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
        <p className="font-semibold text-foreground">Catatan</p>
        <p className="mt-2">{helper}</p>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-foreground">Konfirmasi hapus</span>
        <input
          className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground placeholder:text-muted/70"
          disabled={isPending}
          name="confirmationText"
          placeholder='Ketik "HAPUS" saat benar-benar ingin menghapus'
          type="text"
        />
      </label>

      {state.preview ? (
        <div className="rounded-[20px] border border-accent/15 bg-accent/10 px-4 py-3 text-sm text-foreground">
          <p>{state.preview.summary}</p>
          {state.preview.details?.length ? (
            <div className="mt-3 space-y-2 text-sm leading-6 text-foreground/90">
              {state.preview.details.map((detail) => (
                <p key={detail}>• {detail}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-[20px] border border-warning/15 bg-warning/10 px-4 py-3 text-sm text-warning">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-[20px] border border-success/15 bg-success/10 px-4 py-3 text-sm text-success">
          {state.success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="button-press inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          name="intent"
          type="submit"
          value="preview"
        >
          {isPending ? "Memproses..." : "Preview periode"}
        </button>
        <button
          className="button-press inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canExport}
          onClick={handleExport}
          type="button"
        >
          Export CSV
        </button>
        <button
          className="button-press inline-flex h-11 items-center justify-center rounded-full bg-warning px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          name="intent"
          type="submit"
          value="delete"
        >
          {isPending ? "Menghapus..." : "Hapus periode"}
        </button>
      </div>
    </form>
  );
}

type SettingsMaintenanceFormsProps = {
  attendanceSafeMonths: Array<{
    key: string;
    label: string;
  }>;
};

export function SettingsMaintenanceForms({ attendanceSafeMonths }: SettingsMaintenanceFormsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <MaintenanceFormCard
        action={attendanceMaintenanceAction}
        description="Hapus riwayat absensi mentah pada rentang tanggal tertentu agar ukuran database OPS tetap terkendali."
        exportDataset="attendance"
        helper="Sebelum menghapus, gunakan preview dulu. Absensi hanya bisa dibersihkan untuk bulan yang sudah lewat, dan sistem akan mengamankan snapshot KPI periode terdampak terlebih dahulu."
        title="Bersihkan absensi per periode"
      >
        <div className="rounded-[20px] border border-accent/15 bg-accent/8 px-4 py-4 text-sm leading-7 text-muted">
          <p className="font-semibold text-foreground">Bulan yang aman dibersihkan</p>
          {attendanceSafeMonths.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {attendanceSafeMonths.map((month) => (
                <span
                  key={month.key}
                  className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground"
                >
                  {month.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2">
              Belum ada data absensi dari bulan yang sudah lewat, jadi belum ada periode yang aman
              untuk dibersihkan.
            </p>
          )}
        </div>
      </MaintenanceFormCard>

      <MaintenanceFormCard
        action={hiddenProgressMaintenanceAction}
        description="Hapus progress closing yang sebelumnya sudah disembunyikan dari dashboard pada rentang tanggal tertentu."
        exportDataset="hidden-progress"
        helper="Hanya progress closing yang sudah tersembunyi dari dashboard yang akan ikut dibersihkan. Ringkasan KPI bulanan dan tahunan yang sudah tersimpan tetap dipertahankan."
        title="Bersihkan progress closing tersembunyi"
      />
    </div>
  );
}
