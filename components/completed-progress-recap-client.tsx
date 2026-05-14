"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  hideAllCompletedProgressFromDashboardAction,
  hideCompletedProgressFromDashboardAction,
} from "@/app/dashboard/actions";
import { formatDate } from "@/lib/utils";

type CompletedProgressRecapRow = {
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasRows = localRows.length > 0;
  const sortedRows = useMemo(() => localRows, [localRows]);

  async function handleHide(progressId: string) {
    setPendingId(progressId);
    setFeedback(null);
    const previousRows = localRows;
    setLocalRows((currentRows) => currentRows.filter((row) => row.id !== progressId));

    const result = await hideCompletedProgressFromDashboardAction(progressId);

    if (!result.ok) {
      setLocalRows(previousRows);
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
    const previousRows = localRows;
    setLocalRows([]);

    const result = await hideAllCompletedProgressFromDashboardAction();

    if (!result.ok) {
      setLocalRows(previousRows);
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-line bg-surface p-5">
        <p className="text-sm leading-7 text-muted">
          Anda bisa menyembunyikan semua recap sekaligus. Histori pekerjaan dan nilai KPI yang
          sudah terbentuk tetap aman.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-press inline-flex h-11 items-center justify-center rounded-full bg-warning px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBulkPending}
            onClick={() => void handleHideAll()}
            type="button"
          >
            {isBulkPending ? "Menyembunyikan..." : "Sembunyikan semua recap"}
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-[20px] border border-success/15 bg-success/10 px-4 py-3 text-sm leading-7 text-success">
          {feedback}
          {isPending ? " Menyegarkan dashboard..." : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedRows.map((row) => {
          const isRowPending = pendingId === row.id;

          return (
            <article className="rounded-[24px] border border-line bg-surface p-5" key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{row.pekerjaan}</p>
                  <p className="mt-1 text-sm text-muted">{row.name}</p>
                </div>
                <StatusChip label="Closed" tone="success" />
              </div>
              {row.detail ? (
                <p className="mt-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-7 text-muted">
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
                  className="button-press inline-flex h-11 items-center justify-center rounded-full bg-warning px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
