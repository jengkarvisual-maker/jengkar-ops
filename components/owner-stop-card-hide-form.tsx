"use client";

import { hideStopCardFromDashboardAction } from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type OwnerStopCardHideFormProps = {
  stopCardId: string;
};

export function OwnerStopCardHideForm({ stopCardId }: OwnerStopCardHideFormProps) {
  return (
    <form
      action={hideStopCardFromDashboardAction}
      onSubmit={(event) => {
        if (!window.confirm("Yakin ingin menyembunyikan STOP CARD ini dari dashboard?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="stopCardId" type="hidden" value={stopCardId} />
      <input name="dashboardTab" type="hidden" value="daily" />
      <FormSubmitButton
        className="button-press inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        pendingLabel="Menyembunyikan..."
      >
        Sembunyikan
      </FormSubmitButton>
    </form>
  );
}
