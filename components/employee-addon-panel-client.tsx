"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  saveEmployeeAddonAction,
  type EmployeeAddonMutationRow,
} from "@/app/dashboard/actions";
import { ADDON_TYPE_OPTIONS } from "@/lib/work-tracking";
import { formatDate, formatDateTime } from "@/lib/utils";

type EmployeeAddonPanelClientProps = {
  initialRows: EmployeeAddonMutationRow[];
  initialTotalQuantity: number;
  monthLabel: string;
};

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="ui-surface border-dashed px-5 py-8 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

export function EmployeeAddonPanelClient({
  initialRows,
  monthLabel,
}: EmployeeAddonPanelClientProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [optimisticRows, setOptimisticRows] = useState<EmployeeAddonMutationRow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const quantityOptions = useMemo(
    () => Array.from({ length: 10 }, (_, index) => index + 1),
    [],
  );

  const rows = useMemo(() => {
    const seen = new Set<string>();

    return [...optimisticRows, ...initialRows].filter((row) => {
      if (seen.has(row.id)) {
        return false;
      }

      seen.add(row.id);
      return true;
    });
  }, [initialRows, optimisticRows]);

  const monthlyTotalQuantity = useMemo(() => {
    const quantities = new Map<string, number>();

    initialRows.forEach((row) => {
      quantities.set(row.id, row.addonQuantity);
    });

    optimisticRows.forEach((row) => {
      quantities.set(row.id, row.addonQuantity);
    });

    return Array.from(quantities.values()).reduce((sum, value) => sum + value, 0);
  }, [initialRows, optimisticRows]);

  const hasRows = rows.length > 0;

  async function handleSubmit(formData: FormData) {
    setFeedback(null);
    setIsSaving(true);

    const result = await saveEmployeeAddonAction(formData);
    setIsSaving(false);

    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setOptimisticRows((currentRows) => [
      result.row,
      ...currentRows.filter((row) => row.id !== result.row.id),
    ]);
    setFeedback(result.message);
    formRef.current?.reset();

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.4fr_0.6fr]">
        <form
          action={handleSubmit}
          className="ui-surface grid gap-4 p-4 md:p-5"
          ref={formRef}
        >
          <div className="ui-pill w-fit px-3 py-1 text-[0.68rem] tracking-[0.12em]">
            Input add-on {monthLabel}
          </div>
          <p className="text-sm leading-6 text-muted">
            Tanggal input memakai tanggal hari ini otomatis. Pilih jenis pekerjaan add-on dan jumlahnya, lalu simpan.
          </p>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Jumlah pekerjaan add-on</span>
            <select
              className="ui-select"
              defaultValue="1"
              name="addonQuantity"
              required
            >
              {quantityOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Jenis pekerjaan add-on</span>
            <select
              className="ui-select"
              defaultValue={ADDON_TYPE_OPTIONS[0]?.value}
              name="addonType"
              required
            >
              {ADDON_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="ui-card px-4 py-4 text-sm leading-6 text-muted">
            Total add-on bulan berjalan: <span className="font-semibold text-foreground">{monthlyTotalQuantity}</span>
          </div>
          <div>
            <button
              className="button-press ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Menyimpan..." : "Simpan add-on"}
            </button>
          </div>
        </form>

        <div className="ui-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Riwayat add-on bulan berjalan</p>
              <p className="mt-1 text-sm text-muted">Semua add-on yang Anda input di {monthLabel} akan muncul di sini.</p>
            </div>
            <div className="rounded-full border border-success/15 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              Total {monthlyTotalQuantity}
            </div>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-[20px] border border-success/15 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
              {feedback}
              {isPending ? " Menyegarkan dashboard..." : null}
            </div>
          ) : null}

          <div className="mt-4">
            {!hasRows ? (
              <EmptyState
                description="Setelah Anda menyimpan pekerjaan add-on, riwayat bulan berjalan akan langsung muncul di sini."
                title="Belum ada add-on bulan ini"
              />
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <article className="ui-card px-4 py-4" key={row.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{row.addonTypeLabel}</p>
                        <p className="mt-1 text-sm text-muted">
                          {formatDate(row.addonDate)} • dibuat {formatDateTime(row.createdAt)}
                        </p>
                      </div>
                      <div className="ui-pill px-3 py-1 text-[0.68rem] tracking-[0.1em]">
                        {row.addonQuantity} add-on
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
