"use client";

import { hideStopCardFromDashboardAction } from "@/app/dashboard/actions";

type OwnerStopCardHideFormProps = {
  stopCardId: string;
};

export function OwnerStopCardHideForm({ stopCardId }: OwnerStopCardHideFormProps) {
  return (
    <form
      action={hideStopCardFromDashboardAction}
      className="shrink-0"
      onSubmit={(event) => {
        if (!window.confirm("Yakin ingin menyembunyikan STOP CARD ini dari dashboard?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="stopCardId" type="hidden" value={stopCardId} />
      <input name="dashboardTab" type="hidden" value="daily" />
      <button
        className="button-press inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
      >
        Sembunyikan
      </button>
    </form>
  );
}
