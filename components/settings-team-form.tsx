"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createEmployeeAction, type CreateEmployeeState } from "@/app/settings/actions";

const initialState: CreateEmployeeState = {
  error: null,
  success: null,
};

type TeamMemberSummary = {
  id: string;
  name: string;
  email: string;
};

type SettingsTeamFormProps = {
  isProvisioningReady: boolean;
  teamMembers: TeamMemberSummary[];
};

type PasswordFieldProps = {
  disabled?: boolean;
  id: string;
  label: string;
  name: string;
  onToggle: () => void;
  placeholder: string;
  showValue: boolean;
};

function PasswordField({
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
          autoComplete="new-password"
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

export function SettingsTeamForm({
  isProvisioningReady,
  teamMembers,
}: SettingsTeamFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createEmployeeAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [visibleField, setVisibleField] = useState({
    password: false,
    confirm: false,
  });

  useEffect(() => {
    if (!state.success) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.47fr_0.53fr]">
      <article className="ui-panel p-5 md:p-6">
        <div className="ui-pill">
          Tim
        </div>
        <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">Tambah karyawan baru</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Owner bisa membuat akun karyawan langsung dari sini tanpa perlu menambah user
          manual. Akun baru otomatis diberi otoritas yang sama dengan karyawan lain.
        </p>

        <div className="ui-surface mt-5 p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-foreground">Hak akses akun baru</p>
          <p className="mt-2">
            Role akun akan diset sebagai <span className="font-semibold text-foreground">Karyawan</span>.
            Akun baru bisa login, mengisi absensi, mengelola progres pribadinya, dan melihat
            KPI pribadi.
          </p>
          <p className="mt-2">
            Password awal bisa diganti sendiri nanti dari menu Pengaturan Akun setelah login.
          </p>
        </div>

        <div className="ui-surface mt-5 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Karyawan aktif</p>
            <span className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
              {teamMembers.length} akun
            </span>
          </div>

          {teamMembers.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[20px] border border-line bg-white px-4 py-3"
                >
                  <p className="text-sm font-semibold text-foreground">{member.name}</p>
                  <p className="mt-1 text-xs text-muted">{member.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[20px] border border-dashed border-line bg-white px-4 py-4 text-sm text-muted">
              Belum ada karyawan aktif yang tercatat.
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
              <span className="text-sm font-semibold text-foreground">Nama lengkap</span>
              <input
                className="ui-input placeholder:text-muted/70"
                disabled={isPending || !isProvisioningReady}
                name="name"
                placeholder="Contoh: Budi Santoso"
                type="text"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Email kerja</span>
              <input
                autoComplete="email"
                className="ui-input placeholder:text-muted/70"
                disabled={isPending || !isProvisioningReady}
                name="email"
                placeholder="contoh@rumahjengkar.com"
                type="email"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <PasswordField
                disabled={isPending || !isProvisioningReady}
                id="password"
                label="Password awal"
                name="password"
                onToggle={() =>
                  setVisibleField((current) => ({ ...current, password: !current.password }))
                }
                placeholder="Minimal 8 karakter"
                showValue={visibleField.password}
              />
              <PasswordField
                disabled={isPending || !isProvisioningReady}
                id="confirmPassword"
                label="Konfirmasi password"
                name="confirmPassword"
                onToggle={() =>
                  setVisibleField((current) => ({ ...current, confirm: !current.confirm }))
                }
                placeholder="Ulangi password awal"
                showValue={visibleField.confirm}
              />
            </div>
          </div>

          {!isProvisioningReady ? (
            <div className="mt-5 rounded-[20px] border border-warning/15 bg-warning/10 px-4 py-3 text-sm text-warning">
              Supabase admin belum terhubung, jadi pembuatan akun baru dari dashboard owner
              belum bisa dijalankan.
            </div>
          ) : null}

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
              disabled={isPending || !isProvisioningReady}
              type="submit"
            >
              {isPending ? "Membuat akun..." : "Tambah karyawan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
