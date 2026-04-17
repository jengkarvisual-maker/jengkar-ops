import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@prisma/client";

import { signOutAction } from "@/app/login/actions";
import { APP_NAME } from "@/lib/constants";
import { getRoleLabel } from "@/lib/utils";

type DashboardShellProps = {
  children: ReactNode;
  description: string;
  feedback?: {
    type: "success" | "error";
    message: string;
  } | null;
  title: string;
  user: {
    name: string;
    email: string;
    role: UserRole;
  };
};

export function DashboardShell({
  children,
  description,
  feedback,
  title,
  user,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {APP_NAME}
              </div>
              <div>
                <p className="font-mono text-sm text-muted">Dashboard internal</p>
                <h1 className="mt-2 font-serif text-4xl text-foreground md:text-5xl">{title}</h1>
                <p className="mt-3 max-w-3xl text-base leading-8 text-muted">{description}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-line bg-surface p-5 lg:min-w-[320px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="mt-1 text-sm text-muted">{user.email}</p>
                </div>
                <div className="rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                  {getRoleLabel(user.role)}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold transition hover:border-accent/30 hover:text-accent"
                  href="/"
                >
                  Landing app
                </Link>
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold transition hover:border-accent/30 hover:text-accent"
                  href="https://rumahjengkar.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  Portal utama
                </a>
                <form action={signOutAction}>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90"
                    type="submit"
                  >
                    Keluar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {feedback ? (
          <section
            className={`rounded-[24px] border px-5 py-4 text-sm leading-7 shadow-[var(--shadow-soft)] ${
              feedback.type === "success"
                ? "border-success/15 bg-success/10 text-success"
                : "border-warning/15 bg-warning/10 text-warning"
            }`}
          >
            {feedback.message}
          </section>
        ) : null}

        {children}
      </div>
    </main>
  );
}
