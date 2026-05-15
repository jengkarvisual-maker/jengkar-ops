import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@prisma/client";

import { SignOutButton } from "@/components/sign-out-button";
import { APP_NAME } from "@/lib/constants";
import { getRoleLabel } from "@/lib/utils";

type DashboardShellProps = {
  auxiliaryLink?: {
    href: string;
    label: string;
  } | null;
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
  auxiliaryLink,
  children,
  description,
  feedback,
  title,
  user,
}: DashboardShellProps) {
  return (
    <main className="ui-page-shell">
      <div className="ui-page-container space-y-5">
        <header className="ui-panel p-5 md:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="ui-pill">
                {APP_NAME}
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                  Dashboard internal
                </p>
                <h1 className="mt-2 text-[2.2rem] font-extrabold tracking-[-0.04em] text-foreground md:text-[3rem]">
                  {title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted md:text-[0.96rem]">
                  {description}
                </p>
              </div>
            </div>

            <div className="ui-surface p-4 lg:min-w-[300px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="mt-1 text-sm text-muted">{user.email}</p>
                </div>
                <div className="ui-pill px-3 py-1 text-[0.68rem] tracking-[0.12em]">
                  {getRoleLabel(user.role)}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {auxiliaryLink ? (
                  <Link
                    className="button-press ui-button-secondary"
                    href={auxiliaryLink.href}
                  >
                    {auxiliaryLink.label}
                  </Link>
                ) : null}
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        {feedback ? (
          <section
            className={`ui-surface px-4 py-3 text-sm leading-7 ${
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
