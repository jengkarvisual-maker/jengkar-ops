"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { loginAction, type LoginActionState } from "@/app/login/actions";

const initialState: LoginActionState = {
  error: null,
  redirectTo: null,
};

type LoginFormProps = {
  submitDisabled?: boolean;
};

export function LoginForm({ submitDisabled = false }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, startTransition] = useTransition();
  const isSubmitLocked = submitDisabled || isPending || isRedirecting;

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }

    startTransition(() => {
      router.replace(state.redirectTo ?? "/dashboard");
    });
  }, [router, startTransition, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div>
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="h-14 w-full rounded-full border border-line bg-white px-5 text-base text-foreground placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            id="email"
            name="email"
            placeholder="Email"
            type="email"
          />
        </div>

        <div className="relative">
          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="h-14 w-full rounded-full border border-line bg-white px-5 pr-28 text-base text-foreground placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            id="password"
            name="password"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="button-press absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foreground transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? "Sembunyikan" : "Lihat"}
          </button>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-warning">
          {state.error}
        </div>
      ) : null}

      <button
        className="button-press inline-flex h-14 w-full items-center justify-center rounded-full bg-foreground px-5 text-base font-semibold text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitLocked}
        type="submit"
      >
        {isPending || isRedirecting
          ? "Memproses..."
          : submitDisabled
            ? "Login belum aktif"
            : "Masuk ke akun"}
      </button>
    </form>
  );
}
