"use client";

import { lockKpiMonthAction } from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type LockKpiMonthFormProps = {
  disabled?: boolean;
  kpiMonth: string;
};

export function LockKpiMonthForm({ disabled = false, kpiMonth }: LockKpiMonthFormProps) {
  return (
    <form
      action={lockKpiMonthAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Setelah dikunci, KPI final periode ini tidak akan berubah otomatis. Lanjutkan?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="dashboardTab" type="hidden" value="kpi" />
      <input name="kpiMonth" type="hidden" value={kpiMonth} />
      <FormSubmitButton
        className="ui-button-primary button-press disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        pendingLabel="Mengunci..."
      >
        {disabled ? "Sudah Dikunci" : "Kunci KPI Final"}
      </FormSubmitButton>
    </form>
  );
}
