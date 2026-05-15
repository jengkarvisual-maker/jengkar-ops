"use client";

import { useActionState, useState } from "react";
import type { UserRole } from "@prisma/client";

import {
  lockKpiMonthAction,
  resetManagedPasswordAction,
  type LockKpiMonthState,
  type ResetManagedPasswordState,
} from "@/app/settings/actions";
import { formatDateTime, getRoleLabel } from "@/lib/utils";

const initialResetState: ResetManagedPasswordState = {
  error: null,
  success: null,
};

const initialLockState: LockKpiMonthState = {
  error: null,
  success: null,
};

type ResettableUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type KpiMonthOption = {
  key: string;
  label: string;
  year: number;
  month: number;
};

type LockedKpiMonth = {
  key: string;
  label: string;
  lockedAt: string;
  lockedByName: string;
};

type SettingsAdminToolsProps = {
  canLockKpi: boolean;
  isProvisioningReady: boolean;
  kpiLockOptions: KpiMonthOption[];
  lockedKpiMonths: LockedKpiMonth[];
  resettableUsers: ResettableUser[];
};

function PasswordField({
  disabled,
  label,
  name,
  onToggle,
  placeholder,
  showValue,
}: {
  disabled?: boolean;
  label: string;
  name: string;
  onToggle: () => void;
  placeholder: string;
  showValue: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="relative">
        <input
          autoComplete="new-password"
          className="ui-input pr-28 placeholder:text-muted/70"
          disabled={disabled}
          name={name}
          placeholder={placeholder}
          type={showValue ? "text" : "password"}
        />
        <button
          className="button-press ui-button-secondary absolute right-1.5 top-1/2 h-9 -translate-y-1/2 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onToggle}
          type="button"
        >
          {showValue ? "Sembunyikan" : "Lihat"}
        </button>
      </div>
    </label>
  );
}

function ActionMessage({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  return (
    <>
      {error ? (
        <div className="rounded-[20px] border border-warning/15 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[20px] border border-success/15 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      ) : null}
    </>
  );
}

function ResetPasswordCard({
  isProvisioningReady,
  resettableUsers,
}: {
  isProvisioningReady: boolean;
  resettableUsers: ResettableUser[];
}) {
  const [state, formAction, isPending] = useActionState(
    resetManagedPasswordAction,
    initialResetState,
  );
  const [visibleField, setVisibleField] = useState({
    password: false,
    confirm: false,
  });

  return (
    <form
      action={formAction}
      className="ui-panel p-5 md:p-6"
    >
      <div className="ui-pill">
        Bantuan Login
      </div>
      <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">Reset password akun tim</h2>
      <p className="mt-3 text-sm leading-7 text-muted">
        Gunakan fitur ini saat anggota tim lupa password. Password baru langsung berlaku
        untuk login berikutnya.
      </p>

      <div className="ui-surface mt-5 space-y-4 p-4 md:p-5">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Pilih akun</span>
          <select
            className="ui-select"
            disabled={isPending || !isProvisioningReady || resettableUsers.length === 0}
            name="targetUserId"
            required
          >
            <option value="">Pilih akun tim</option>
            {resettableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {getRoleLabel(user.role)}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
          <p className="font-semibold text-foreground">Akun yang bisa dibantu</p>
          {resettableUsers.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {resettableUsers.map((user) => (
                <p key={user.id}>
                  {user.name} <span className="text-xs uppercase tracking-[0.08em]">({getRoleLabel(user.role)})</span> -{" "}
                  {user.email}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2">Belum ada akun tim yang tersedia untuk dibantu reset.</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <PasswordField
            disabled={isPending || !isProvisioningReady}
            label="Password baru"
            name="newPassword"
            onToggle={() =>
              setVisibleField((current) => ({ ...current, password: !current.password }))
            }
            placeholder="Minimal 8 karakter"
            showValue={visibleField.password}
          />
          <PasswordField
            disabled={isPending || !isProvisioningReady}
            label="Konfirmasi password"
            name="confirmPassword"
            onToggle={() =>
              setVisibleField((current) => ({ ...current, confirm: !current.confirm }))
            }
            placeholder="Ulangi password baru"
            showValue={visibleField.confirm}
          />
        </div>

        {!isProvisioningReady ? (
          <div className="rounded-[20px] border border-warning/15 bg-warning/10 px-4 py-3 text-sm text-warning">
            Supabase admin belum terhubung, jadi reset password belum bisa dijalankan.
          </div>
        ) : null}

        <ActionMessage error={state.error} success={state.success} />

        <button
          className="button-press ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !isProvisioningReady || resettableUsers.length === 0}
          type="submit"
        >
          {isPending ? "Mereset password..." : "Reset password akun"}
        </button>
      </div>
    </form>
  );
}

function KpiLockCard({
  kpiLockOptions,
  lockedKpiMonths,
}: {
  kpiLockOptions: KpiMonthOption[];
  lockedKpiMonths: LockedKpiMonth[];
}) {
  const [state, formAction, isPending] = useActionState(lockKpiMonthAction, initialLockState);

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="ui-panel p-5 md:p-6"
      >
        <div className="ui-pill">
          Evaluasi KPI
        </div>
        <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">Kunci KPI bulanan</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Setelah owner setuju, bulan yang dikunci tidak akan berubah lagi walaupun ada edit
          absensi atau progres lama.
        </p>

        <div className="ui-surface mt-5 space-y-4 p-4 md:p-5">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Pilih periode</span>
            <select
              className="ui-select"
              disabled={isPending || kpiLockOptions.length === 0}
              name="monthKey"
              required
            >
              <option value="">Pilih bulan yang sudah selesai</option>
              {kpiLockOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-[20px] border border-line bg-white px-4 py-4 text-sm leading-7 text-muted">
            <p className="font-semibold text-foreground">Cara kerja lock</p>
            <p className="mt-2">
              Sistem akan sinkronkan KPI periode terpilih lebih dulu, lalu mengunci hasilnya.
              Setelah itu, perubahan data mentah pada bulan tersebut tidak akan menggeser nilai
              evaluasi yang sudah disepakati.
            </p>
          </div>

          <ActionMessage error={state.error} success={state.success} />

          <button
            className="button-press ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || kpiLockOptions.length === 0}
            type="submit"
          >
            {isPending ? "Mengunci KPI..." : "Kunci KPI bulanan"}
          </button>

          {kpiLockOptions.length === 0 ? (
            <p className="text-sm text-muted">
              Belum ada bulan selesai yang siap dikunci, atau semua periode yang tersedia sudah
              terkunci.
            </p>
          ) : null}
        </div>
      </form>

      <article className="ui-panel p-5 md:p-6">
        <h3 className="text-[1.4rem] font-extrabold tracking-[-0.03em] text-foreground">Riwayat KPI terkunci</h3>
        <p className="mt-2 text-sm leading-7 text-muted">
          Daftar ini membantu owner memastikan periode evaluasi mana saja yang sudah final.
        </p>

        <div className="ui-surface mt-5 p-4 md:p-5">
          {lockedKpiMonths.length > 0 ? (
            <div className="grid gap-3">
              {lockedKpiMonths.map((lockedMonth) => (
                <div
                  key={lockedMonth.key}
                  className="rounded-[20px] border border-line bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{lockedMonth.label}</p>
                    <span className="inline-flex rounded-full border border-success/15 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-success">
                      Terkunci
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Dikunci oleh {lockedMonth.lockedByName} pada {formatDateTime(lockedMonth.lockedAt)}
                  </p>
                  <div className="mt-4">
                    <a
                      className="button-press ui-button-secondary h-10 px-4 text-sm"
                      href={`/api/kpi-locks/export?monthKey=${encodeURIComponent(lockedMonth.key)}`}
                    >
                      Download CSV KPI final
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[20px] border border-dashed border-line bg-white px-4 py-4 text-sm text-muted">
              Belum ada periode KPI yang dikunci.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

export function SettingsAdminTools({
  canLockKpi,
  isProvisioningReady,
  kpiLockOptions,
  lockedKpiMonths,
  resettableUsers,
}: SettingsAdminToolsProps) {
  if (canLockKpi) {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.52fr_0.48fr]">
        <ResetPasswordCard
          isProvisioningReady={isProvisioningReady}
          resettableUsers={resettableUsers}
        />
        <KpiLockCard kpiLockOptions={kpiLockOptions} lockedKpiMonths={lockedKpiMonths} />
      </div>
    );
  }

  return (
    <ResetPasswordCard
      isProvisioningReady={isProvisioningReady}
      resettableUsers={resettableUsers}
    />
  );
}
