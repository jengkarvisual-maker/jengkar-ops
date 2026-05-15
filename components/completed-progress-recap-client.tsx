"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  hideAllCompletedProgressFromDashboardAction,
  hideCompletedProgressFromDashboardAction,
} from "@/app/dashboard/actions";
import { formatDate } from "@/lib/utils";

export const COMPLETED_PROGRESS_UPSERT_EVENT = "ops:completed-progress-upsert";

export type CompletedProgressRecapRow = {
  id: string;
  pekerjaan: string;
  detail: string | null;
  name: string;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  revisiDone: string | null;
};

type CompletedProgressRecapClientProps = {
  emptyDescription: string;
  rows: CompletedProgressRecapRow[];
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

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "success";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        tone === "success"
          ? "border-success/15 bg-success/10 text-success"
          : "border-line bg-white text-foreground"
      }`}
    >
      {label}
    </span>
  );
}

export function CompletedProgressRecapClient({
  emptyDescription,
  rows,
}: CompletedProgressRecapClientProps) {
  const router = useRouter();
  const [localRows, setLocalRows] = useState(rows);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  useEffect(() => {
    function handleUpsert(event: Event) {
      const detail = (event as CustomEvent<CompletedProgressRecapRow>).detail;

      if (!detail) {
        return;
      }

      setHiddenIds((currentIds) => {
        if (!currentIds.has(detail.id)) {
          return currentIds;
        }

        const nextIds = new Set(currentIds);
        nextIds.delete(detail.id);
        return nextIds;
      });
      setLocalRows((currentRows) => [
        detail,
        ...currentRows.filter((row) => row.id !== detail.id),
      ]);
    }

    window.addEventListener(COMPLETED_PROGRESS_UPSERT_EVENT, handleUpsert);

    return () => {
      window.removeEventListener(COMPLETED_PROGRESS_UPSERT_EVENT, handleUpsert);
    };
  }, []);

  const sortedRows = useMemo(
    () => localRows.filter((row) => !hiddenIds.has(row.id)),
    [hiddenIds, localRows],
  );
  const hasRows = sortedRows.length > 0;

  async function handleHide(progressId: string) {
    setPendingId(progressId);
    setFeedback(null);
    setHiddenIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(progressId);
      return nextIds;
    });

    const result = await hideCompletedProgressFromDashboardAction(progressId);

    if (!result.ok) {
      setHiddenIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(progressId);
        return nextIds;
      });
      setPendingId(null);
      setFeedback(result.message);
      return;
    }

    setPendingId(null);
    setFeedback(result.message);

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleHideAll() {
    setIsBulkPending(true);
    setFeedback(null);
    const previousHiddenIds = new Set(hiddenIds);
    setHiddenIds((currentIds) => {
      const nextIds = new Set(currentIds);
      for (const row of localRows) {
        nextIds.add(row.id);
      }
      return nextIds;
    });

    const result = await hideAllCompletedProgressFromDashboardAction();

    if (!result.ok) {
      setHiddenIds(previousHiddenIds);
      setIsBulkPending(false);
      setFeedback(result.message);
      return;
    }

    setIsBulkPending(false);
    setFeedback(result.message);

    startTransition(() => {
      router.refresh();
    });
  }

  if (!hasRows) {
    return <EmptyState description={emptyDescription} title="Belum ada pekerjaan yang closing" />;
  }

  return (
    <div className="space-y-4">
      <div className="ui-surface flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
        <p className="text-sm leading-6 text-muted">
          Anda bisa menyembunyikan semua recap sekaligus. Histori pekerjaan dan nilai KPI yang
          sudah terbentuk tetap aman.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-press ui-button-danger disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBulkPending}
            onClick={() => void handleHideAll()}
            type="button"
          >
            {isBulkPending ? "Menyembunyikan..." : "Sembunyikan semua recap"}
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-[20px] border border-success/15 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
          {feedback}
          {isPending ? " Menyegarkan dashboard..." : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedRows.map((row) => {
          const isRowPending = pendingId === row.id;

          return (
            <article className="ui-surface p-4 md:p-5" key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{row.pekerjaan}</p>
                  <p className="mt-1 text-sm text-muted">{row.name}</p>
                </div>
                <StatusChip label="Closed" tone="success" />
              </div>
              {row.detail ? (
                <p className="ui-card mt-4 px-4 py-3 text-sm leading-6 text-muted">
                  {row.detail}
                </p>
              ) : null}
              <div className="mt-4 space-y-2 text-sm text-muted">
                <p>Mulai: {formatDate(row.tanggalMulai)}</p>
                <p>Selesai: {formatDate(row.tanggalSelesai)}</p>
                <p>Revisi done: {formatDate(row.revisiDone)}</p>
              </div>
              <div className="mt-4">
                <button
                  className="button-press ui-button-danger disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isRowPending}
                  onClick={() => void handleHide(row.id)}
                  type="button"
                >
                  {isRowPending ? "Menyembunyikan..." : "Hapus dari dashboard"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
