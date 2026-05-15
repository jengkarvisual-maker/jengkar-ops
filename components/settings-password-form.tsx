"use client";

import { useActionState, useState } from "react";

import { changePasswordAction, type ChangePasswordState } from "@/app/settings/actions";

const initialState: ChangePasswordState = {
  error: null,
  success: null,
};

type PasswordFieldProps = {
  autoComplete: string;
  id: string;
  label: string;
  name: string;
  placeholder: string;
  showValue: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

function PasswordField({
  autoComplete,
  disabled,
  id,
  label,
  name,
  onToggle,
  placeholder,
  showValue,
}: PasswordFieldProps) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className="ui-input pr-28 placeholder:text-muted/70"
          disabled={disabled}
          id={id}
          name={name}
          placeholder={placeholder}
          type={showValue ? "text" : "password"}
        />
        <button
          aria-label={showValue ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
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

export function SettingsPasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);
  const [visibleField, setVisibleField] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  return (
    <form action={formAction} className="ui-surface space-y-5 p-4 md:p-5">
      <PasswordField
        autoComplete="current-password"
        disabled={isPending}
        id="currentPassword"
        label="Password saat ini"
        name="currentPassword"
        onToggle={() =>
          setVisibleField((current) => ({ ...current, current: !current.current }))
        }
        placeholder="Masukkan password saat ini"
        showValue={visibleField.current}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PasswordField
          autoComplete="new-password"
          disabled={isPending}
          id="newPassword"
          label="Password baru"
          name="newPassword"
          onToggle={() => setVisibleField((current) => ({ ...current, next: !current.next }))}
          placeholder="Minimal 8 karakter"
          showValue={visibleField.next}
        />
        <PasswordField
          autoComplete="new-password"
          disabled={isPending}
          id="confirmPassword"
          label="Konfirmasi password baru"
          name="confirmPassword"
          onToggle={() =>
            setVisibleField((current) => ({ ...current, confirm: !current.confirm }))
          }
          placeholder="Ulangi password baru"
          showValue={visibleField.confirm}
        />
      </div>

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

      <button
        className="button-press ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Menyimpan..." : "Perbarui password"}
      </button>
    </form>
  );
}
