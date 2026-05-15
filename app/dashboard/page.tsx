import { UserRole } from "@prisma/client";

import { DashboardPanels } from "@/components/dashboard-panels-interactive";
import { DashboardShell } from "@/components/dashboard-shell";
import { ROLE_COPY } from "@/lib/constants";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  getAdminDashboardData,
  getEmployeeDashboardData,
  getOwnerDashboardData,
} from "@/lib/dashboard";
import type { OwnerDashboardTab } from "@/types/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readFeedback(searchParams?: Record<string, string | string[] | undefined>) {
  const feedbackType = searchParams?.feedbackType;
  const feedbackMessage = searchParams?.feedbackMessage;

  if (
    typeof feedbackType !== "string" ||
    typeof feedbackMessage !== "string" ||
    (feedbackType !== "success" && feedbackType !== "error")
  ) {
    return null;
  }

  return {
    type: feedbackType,
    message: feedbackMessage,
  } as const;
}

function readSingleParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = searchParams?.[key];

  return typeof value === "string" ? value : undefined;
}

function readOwnerDashboardTab(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): OwnerDashboardTab {
  const value = readSingleParam(searchParams, "tab");
  return value === "addon" || value === "kpi" ? value : "daily";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireAuthenticatedUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const feedback = readFeedback(resolvedSearchParams);

  if (user.role === UserRole.OWNER) {
    const activeTab = readOwnerDashboardTab(resolvedSearchParams);
    const data = await getOwnerDashboardData({
      tab: activeTab,
      lockedMonthKey: readSingleParam(resolvedSearchParams, "lockedMonth"),
      monitoringMonthKey: readSingleParam(resolvedSearchParams, "trackingMonth"),
      monitoringUserId: readSingleParam(resolvedSearchParams, "trackingUser"),
      simulationAmount: readSingleParam(resolvedSearchParams, "simAmount"),
      simulationEndMonthKey: readSingleParam(resolvedSearchParams, "simEnd"),
      simulationStartMonthKey: readSingleParam(resolvedSearchParams, "simStart"),
    });

    return (
      <DashboardShell
        auxiliaryLink={{
          href: "/settings",
          label: "Pengaturan",
        }}
        description={ROLE_COPY.OWNER.description}
        feedback={feedback}
        title="Dashboard Owner"
        user={user}
      >
        <DashboardPanels.Owner data={data} />
      </DashboardShell>
    );
  }

  if (user.role === UserRole.ADMIN) {
    const data = await getAdminDashboardData();

    return (
      <DashboardShell
        auxiliaryLink={{
          href: "/settings",
          label: "Pengaturan",
        }}
        description={ROLE_COPY.ADMIN.description}
        feedback={feedback}
        title="Dashboard Admin"
        user={user}
      >
        <DashboardPanels.Admin data={data} />
      </DashboardShell>
    );
  }

  const data = await getEmployeeDashboardData(user.id);

  return (
    <DashboardShell
      auxiliaryLink={{
        href: "/settings",
        label: "Pengaturan",
      }}
      description={ROLE_COPY.KARYAWAN.description}
      feedback={feedback}
      title="Dashboard Karyawan"
      user={user}
    >
      <DashboardPanels.Employee data={data} />
    </DashboardShell>
  );
}
