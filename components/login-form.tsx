"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "@/app/login/actions";

const initialState: LoginActionState = {
  error: null,
};

type LoginFormProps = {
  disabled?: boolean;
};

export function LoginForm({ disabled = false }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground placeholder:text-muted/70"
          disabled={disabled || isPending}
          id="email"
          name="email"
          placeholder="nama@jengkar.com"
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-foreground placeholder:text-muted/70"
          disabled={disabled || isPending}
          id="password"
          name="password"
          placeholder="Masukkan password"
          type="password"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-warning">
          {state.error}
        </div>
      ) : null}

      <button
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || isPending}
        type="submit"
      >
        {isPending ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
