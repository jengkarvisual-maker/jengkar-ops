"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

import { signOutAction, type SignOutActionState } from "@/app/login/actions";

const initialState: SignOutActionState = {
  error: null,
  redirectTo: null,
};

type SignOutButtonProps = {
  className?: string;
  label?: string;
  pendingLabel?: string;
};

export function SignOutButton({
  className = "button-press inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60",
  label = "Keluar",
  pendingLabel = "Keluar...",
}: SignOutButtonProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(signOutAction, initialState);
  const [isRedirecting, startTransition] = useTransition();

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }

    startTransition(() => {
      router.replace(state.redirectTo ?? "/login");
    });
  }, [router, startTransition, state.redirectTo]);

  return (
    <form action={formAction}>
      <button className={className} disabled={isPending || isRedirecting} type="submit">
        {isPending || isRedirecting ? pendingLabel : label}
      </button>
    </form>
  );
}
