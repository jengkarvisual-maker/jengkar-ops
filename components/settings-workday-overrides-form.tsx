"use client";

import { WorkdayOverrideType } from "@prisma/client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  deleteWorkdayOverrideAction,
  type WorkdayOverrideState,
  upsertWorkdayOverrideAction,
} from "@/app/settings/actions";

const initialState: WorkdayOverrideState = {
  error: null,
  success: null,
};

type WorkdayOverrideSummary = {
  id: string;
  date: string;
  type: WorkdayOverrideType;
  label: string;
  startTime: string | null;
  endTime: string | null;
  updatedAt: string;
  createdByName: string | null;
};

type SettingsWorkdayOverridesFormProps = {
  overrides: WorkdayOverrideSummary[];
};

function formatOverrideDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function DeleteOverrideButton({ overrideId }: { overrideId: string }) {
  const [state, formAction, isPending] = useActionState(deleteWorkdayOverrideAction, initialState);

  return (
    <form action={formAction}>
      <input name="overrideId" type="hidden" value={overrideId} />
      <button
        className="button-press ui-button-danger text-xs disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error ? <p className="mt-2 text-xs text-warning">{state.error}</p> : null}
    </form>
  );
}

export function SettingsWorkdayOverridesForm({
  overrides,
}: SettingsWorkdayOverridesFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(upsertWorkdayOverrideAction, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <section className="grid gap-6 lg:grid-cols-[0.5fr_0.5fr]">
      <article className="ui-panel p-5 md:p-6">
        <div className="ui-pill">
          Kalender kerja
        </div>
        <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">Hari libur & kerja khusus</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          Gunakan override ini untuk menandai hari libur nasional, event Minggu, atau hari
          kerja khusus agar absensi dan KPI membaca konteks tanggal dengan lebih adil.
        </p>

        <div className="ui-surface mt-5 p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-foreground">Cara kerja aman</p>
          <p className="mt-2">
            Override ini tidak mengubah data absensi lama secara permanen. Sistem hanya memakai
            kalender ini saat membaca status absensi dan menghitung KPI periode yang belum
            dikunci.
          </p>
        </div>

        <div className="ui-surface mt-5 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Override aktif terbaru</p>
            <span className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
              {overrides.length} item
            </span>
          </div>

          {overrides.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {overrides.map((override) => (
                <div
                  className="rounded-[20px] border border-line bg-white px-4 py-4"
                  key={override.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{override.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatOverrideDate(override.date)} ·{" "}
                        {override.type === WorkdayOverrideType.HOLIDAY
                          ? "Hari libur"
                          : `Kerja khusus ${override.startTime ?? "--:--"}-${override.endTime ?? "--:--"}`}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Diperbarui {new Date(override.updatedAt).toLocaleString("id-ID")}
                        {override.createdByName ? ` oleh ${override.createdByName}` : ""}
                      </p>
                    </div>
                    <DeleteOverrideButton overrideId={override.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[20px] border border-dashed border-line bg-white px-4 py-4 text-sm text-muted">
              Belum ada override hari libur atau kerja khusus yang tercatat.
            </p>
          )}
        </div>
      </article>

      <form
        action={formAction}
        className="ui-panel p-5 md:p-6"
        ref={formRef}
      >
        <div className="ui-surface p-4 md:p-5">
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Tanggal</span>
              <input
                className="ui-input"
                disabled={isPending}
                name="date"
                type="date"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">Tipe override</span>
                <select className="ui-select" defaultValue={WorkdayOverrideType.HOLIDAY} disabled={isPending} name="type">
                  <option value={WorkdayOverrideType.HOLIDAY}>Hari libur</option>
                  <option value={WorkdayOverrideType.SPECIAL_WORKDAY}>Hari kerja khusus</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">Label</span>
                <input
                  className="ui-input placeholder:text-muted/70"
                  disabled={isPending}
                  name="label"
                  placeholder="Contoh: Libur nasional / Event Minggu"
                  type="text"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">Jam mulai</span>
                <input
                  className="ui-input placeholder:text-muted/70"
                  disabled={isPending}
                  name="startTime"
                  placeholder="09:00"
                  type="time"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">Jam selesai</span>
                <input
                  className="ui-input placeholder:text-muted/70"
                  disabled={isPending}
                  name="endTime"
                  placeholder="16:00"
                  type="time"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-line bg-white px-4 py-3 text-sm text-muted">
            Isi jam mulai dan selesai hanya saat memilih <span className="font-semibold text-foreground">Hari kerja khusus</span>.
            Jika memilih <span className="font-semibold text-foreground">Hari libur</span>, kolom jam akan diabaikan.
          </div>

          {state.error ? (
            <div className="mt-5 rounded-[20px] border border-warning/15 bg-warning/10 px-4 py-3 text-sm text-warning">
              {state.error}
            </div>
          ) : null}

          {state.success ? (
            <div className="mt-5 rounded-[20px] border border-success/15 bg-success/10 px-4 py-3 text-sm text-success">
              {state.success}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="button-press ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Menyimpan..." : "Simpan override kalender"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
