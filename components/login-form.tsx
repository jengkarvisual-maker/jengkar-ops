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
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div>
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="ui-input placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="ui-input pr-28 placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            id="password"
            name="password"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="button-press ui-button-secondary absolute right-1.5 top-1/2 h-9 -translate-y-1/2 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? "Sembunyikan" : "Lihat"}
          </button>
        </div>
      </div>

      {state.error ? (
        <div className="ui-surface border-warning/15 bg-warning/10 px-4 py-3 text-sm text-warning">
          {state.error}
        </div>
      ) : null}

      <button
        className="button-press ui-button-primary h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
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
