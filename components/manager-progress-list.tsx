"use client";

import { useState, type ReactNode } from "react";

import {
  cancelProgressAction,
  closeProgressAction,
  updateManagerProgressAction,
} from "@/app/dashboard/actions";
import { getJobGroupLabel, getJobWeight, JOB_OPTIONS } from "@/lib/job-catalog";
import type { DashboardUser, ProgressItem } from "@/types/dashboard";

const APP_TIME_ZONE = "Asia/Jakarta";

export type ManagerProgressItem = Omit<
  ProgressItem,
  | "targetSelesai"
  | "tanggalMulai"
  | "tanggalSelesai"
  | "tanggalRevisi"
  | "revisiDone"
  | "canceledAt"
  | "createdAt"
> & {
  targetSelesai: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  tanggalRevisi: string | null;
  revisiDone: string | null;
  canceledAt: string | null;
  createdAt: string;
};

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const displayDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parseDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: Date | string | null) {
  const date = parseDate(value);
  return date ? displayDateFormatter.format(date) : "-";
}

function formatDateInput(value?: Date | string | null) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const parts = datePartsFormatter.formatToParts(date).reduce<Record<string, string>>(
    (map, part) => {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }

      return map;
    },
    {},
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toneClass(tone: "default" | "success" | "warning" | "pending") {
  if (tone === "success") return "border-success/15 bg-success/10 text-success";
  if (tone === "warning") return "border-warning/15 bg-warning/10 text-warning";
  if (tone === "pending") return "border-pending/15 bg-pending/10 text-pending";
  return "border-line bg-white text-foreground";
}

function StatusChip({ label, tone }: { label: string; tone: "default" | "success" | "warning" | "pending" }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>{label}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-line bg-surface px-5 py-10 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted">{description}</p>
    </div>
  );
}

function ActionButton({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "light" | "danger" | "success";
}) {
  const className =
    tone === "light"
      ? "border border-line bg-white text-foreground hover:border-accent/25 hover:text-accent"
      : tone === "danger"
        ? "bg-warning text-white hover:opacity-90"
        : tone === "success"
          ? "bg-success text-white hover:opacity-90"
          : "bg-foreground text-background hover:bg-foreground/90";

  return (
    <button className={`button-press inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${className}`} type="submit">
      {children}
    </button>
  );
}

function InputField({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  type?: "text" | "date";
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground" defaultValue={defaultValue} name={name} type={type} />
    </label>
  );
}

function LockedDateField({
  defaultValue,
  label,
  name,
  locked,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  locked: boolean;
}) {
  if (!locked) {
    return <InputField defaultValue={defaultValue} label={label} name={name} type="date" />;
  }

  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input className="h-11 w-full cursor-not-allowed rounded-2xl border border-line bg-surface px-4 text-sm text-muted" disabled readOnly value={defaultValue ?? ""} type="date" />
      <input name={name} type="hidden" value={defaultValue ?? ""} />
      <span className="block text-xs font-medium text-muted">Terkunci setelah target dibuat.</span>
    </label>
  );
}

function TextareaField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string;
  label: string;
  name: string;
}) {
  return (
    <label className="space-y-2 xl:col-span-3">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-foreground" defaultValue={defaultValue} maxLength={1000} name={name} />
    </label>
  );
}

function EmployeeSelectField({
  defaultValue,
  teamUsers,
}: {
  defaultValue?: string;
  teamUsers: DashboardUser[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">Karyawan</span>
      <select className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground" defaultValue={defaultValue} name="userId" required>
        {teamUsers.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

function JobSelectField({ defaultValue }: { defaultValue?: string }) {
  const hasKnownValue = JOB_OPTIONS.some((option) => option.name === defaultValue);

  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">Pekerjaan</span>
      <select className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground" defaultValue={defaultValue} name="pekerjaan" required>
        {!hasKnownValue && defaultValue ? <option value={defaultValue}>{defaultValue}</option> : null}
        {JOB_OPTIONS.map((option) => (
          <option key={option.name} value={option.name}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

export function ManagerProgressList({
  rows,
  teamUsers,
}: {
  rows: ManagerProgressItem[];
  teamUsers: DashboardUser[];
}) {
  const initialUserId = rows[0]?.userId ?? teamUsers[0]?.id ?? "";
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const selectedUser = teamUsers.find((user) => user.id === selectedUserId) ?? teamUsers[0];
  const selectedRows = rows.filter((row) => row.userId === selectedUser?.id);

  if (teamUsers.length === 0) {
    return <EmptyState description="Belum ada akun karyawan yang bisa dipilih untuk pengelolaan pekerjaan." title="Belum ada karyawan" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-line bg-surface p-5">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Pilih karyawan</span>
          <select
            className="h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground md:max-w-md"
            onChange={(event) => setSelectedUserId(event.target.value)}
            value={selectedUser?.id ?? ""}
          >
            {teamUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm leading-7 text-muted">
          {selectedRows.length} pekerjaan aktif untuk {selectedUser?.name ?? "karyawan terpilih"}.
        </p>
      </div>

      {selectedRows.length === 0 ? (
        <EmptyState description="Pekerjaan aktif karyawan terpilih akan muncul di sini. Pekerjaan yang dibatalkan atau sudah closing tidak tampil di daftar berjalan." title="Belum ada pekerjaan berjalan" />
      ) : (
        <div className="grid gap-4">
          {selectedRows.map((row) => (
            <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{row.pekerjaan}</p>
                  {row.detail ? <p className="mt-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-7 text-muted">{row.detail}</p> : null}
                  <p className="mt-1 text-sm text-muted">Dibuat {formatDate(row.createdAt)} • Bobot {getJobWeight(row.pekerjaan)} • {getJobGroupLabel(row.pekerjaan)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip label={row.isDone ? "Done" : "Ongoing"} tone={row.isDone ? "success" : "pending"} />
                  <StatusChip label={row.closing ? "Closed" : "Aktif"} tone={row.closing ? "success" : "default"} />
                </div>
              </div>
              <form action={updateManagerProgressAction} className="mt-5 grid gap-4 xl:grid-cols-3">
                <input name="progressId" type="hidden" value={row.id} />
                <JobSelectField defaultValue={row.pekerjaan} />
                <EmployeeSelectField defaultValue={row.userId} teamUsers={teamUsers} />
                <LockedDateField defaultValue={formatDateInput(row.targetSelesai)} label="Target selesai" locked={Boolean(row.targetSelesai)} name="targetSelesai" />
                <InputField defaultValue={formatDateInput(row.tanggalMulai)} label="Tanggal mulai" name="tanggalMulai" type="date" />
                <InputField defaultValue={formatDateInput(row.tanggalSelesai)} label="Tanggal selesai" name="tanggalSelesai" type="date" />
                <InputField defaultValue={formatDateInput(row.tanggalRevisi)} label="Tanggal revisi" name="tanggalRevisi" type="date" />
                <InputField defaultValue={formatDateInput(row.revisiDone)} label="Revisi done" name="revisiDone" type="date" />
                <TextareaField defaultValue={row.detail ?? ""} label="Detail pekerjaan" name="detail" />
                <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground"><input defaultChecked={row.isDone} name="isDone" type="checkbox" />Tandai done</label>
                <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground"><input defaultChecked={row.closing} name="closing" type="checkbox" />Tandai closing</label>
                <div className="flex flex-wrap gap-3 xl:col-span-3">
                  <ActionButton>Simpan perubahan</ActionButton>
                </div>
              </form>
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={closeProgressAction}>
                  <input name="progressId" type="hidden" value={row.id} />
                  <ActionButton tone="success">Closing cepat</ActionButton>
                </form>
                <form
                  action={cancelProgressAction}
                  onSubmit={(event) => {
                    if (!window.confirm("Batalkan pekerjaan ini? Pekerjaan yang dibatalkan tidak akan masuk penilaian KPI.")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input name="progressId" type="hidden" value={row.id} />
                  <ActionButton tone="danger">Batalkan pekerjaan</ActionButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
