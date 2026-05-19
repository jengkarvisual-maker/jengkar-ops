import { UserRole } from "@prisma/client";

import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsAdminTools } from "@/components/settings-admin-tools";
import { SettingsMaintenanceForms } from "@/components/settings-maintenance-forms";
import { SettingsPasswordForm } from "@/components/settings-password-form";
import { SettingsTeamForm } from "@/components/settings-team-form";
import { SettingsWorkdayOverridesForm } from "@/components/settings-workday-overrides-form";
import { canResetManagedPasswords, requireAuthenticatedUser } from "@/lib/auth";
import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { addDays, formatMonthYear, getAppDateParts, getRoleLabel, startOfMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const attendanceSafeMonths =
    user.role === UserRole.OWNER ? await getAttendanceSafeMonths() : [];
  const teamMembers =
    user.role === UserRole.OWNER ? await getOwnerTeamMembers() : [];
  const workdayOverrides =
    user.role === UserRole.OWNER ? await getOwnerWorkdayOverrides() : [];
  const resettableUsers = canResetManagedPasswords(user.role)
    ? await getResettableUsers(user.role)
    : [];
  const kpiLockData =
    user.role === UserRole.OWNER ? await getOwnerKpiLockData() : null;

  return (
    <DashboardShell
      auxiliaryLink={{
        href: "/dashboard",
        label: "Kembali ke Dashboard",
      }}
      description="Kelola keamanan akun pribadi Anda di sini. Password baru akan langsung berlaku untuk login berikutnya."
      title="Pengaturan Akun"
      user={user}
    >
      <section className="grid gap-6 lg:grid-cols-[0.48fr_0.52fr]">
        <article className="ui-panel p-5 md:p-6">
          <div className="ui-pill">
            Keamanan
          </div>
          <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">Ubah password akun</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Gunakan password yang hanya diketahui oleh pemilik akun. Setelah diperbarui,
            login berikutnya akan memakai password baru.
          </p>

          <div className="ui-surface mt-5 p-4 text-sm leading-6 text-muted">
            <p className="font-semibold text-foreground">Panduan singkat</p>
            <p className="mt-2">
              Masukkan password saat ini, lalu buat password baru minimal 8 karakter.
              Gunakan tombol show atau hide jika Anda ingin mengecek ketikan sebelum menyimpan.
            </p>
          </div>
        </article>

        <div className="ui-panel p-5 md:p-6">
          <SettingsPasswordForm />
        </div>
      </section>

      {canResetManagedPasswords(user.role) ? (
        <section className="mt-6">
          <SettingsAdminTools
            canLockKpi={user.role === UserRole.OWNER}
            isProvisioningReady={isSupabaseAdminConfigured()}
            kpiLockOptions={kpiLockData?.availableMonths ?? []}
            lockedKpiMonths={kpiLockData?.lockedMonths ?? []}
            resettableUsers={resettableUsers}
          />
        </section>
      ) : null}

      {user.role === UserRole.OWNER ? (
        <section className="mt-6 space-y-6">
          <SettingsTeamForm
            isProvisioningReady={isSupabaseAdminConfigured()}
            teamMembers={teamMembers}
          />

          <SettingsWorkdayOverridesForm overrides={workdayOverrides} />

          <article className="ui-panel p-5 md:p-6">
            <div className="ui-pill">
              Data Maintenance
            </div>
            <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-foreground">Pembersihan data periodik</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Bagian ini khusus untuk {getRoleLabel(user.role)}. Gunakan preview dulu sebelum
              menghapus data agar database tetap ringan tanpa perlu membatasi aktivitas tim
              harian.
            </p>
            <div className="ui-surface mt-5 p-4 text-sm leading-6 text-muted">
              <p className="font-semibold text-foreground">Prinsip aman</p>
              <p className="mt-2">
                Hapus hanya data operasional mentah yang sudah tidak dibutuhkan. Untuk backup
                penuh, tetap gunakan backup harian atau export manual dari Supabase sebelum
                menjalankan pembersihan besar.
              </p>
            </div>
          </article>

          <SettingsMaintenanceForms attendanceSafeMonths={attendanceSafeMonths} />
        </section>
      ) : null}
    </DashboardShell>
  );
}

async function getResettableUsers(role: UserRole) {
  return prisma.user.findMany({
    where:
      role === UserRole.OWNER
        ? {
            role: {
              in: [UserRole.ADMIN, UserRole.KARYAWAN],
            },
          }
        : {
            role: UserRole.KARYAWAN,
          },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

async function getOwnerKpiLockData() {
  const currentParts = getAppDateParts(new Date());
  const currentKey = `${currentParts.year}-${currentParts.month}`;
  const [kpiRows, lockedRows] = await Promise.all([
    prisma.kpiMonthly.findMany({
      where: {
        user: {
          role: UserRole.KARYAWAN,
        },
      },
      select: {
        year: true,
        month: true,
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          month: "desc",
        },
      ],
    }),
    prisma.kpiMonthLock.findMany({
      include: {
        lockedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          month: "desc",
        },
      ],
    }),
  ]);

  const lockedKeys = new Set(lockedRows.map((row) => `${row.year}-${row.month}`));
  const availableMonthKeys = new Set<string>();

  kpiRows.forEach((row) => {
    const monthKey = `${row.year}-${row.month}`;

    if (monthKey !== currentKey && !lockedKeys.has(monthKey)) {
      availableMonthKeys.add(monthKey);
    }
  });

  const availableMonths = Array.from(availableMonthKeys)
    .map((monthKey) => {
      const [year, month] = monthKey.split("-").map(Number);

      return {
        key: monthKey,
        label: formatMonthYear(month, year),
        year,
        month,
      };
    })
    .sort((left, right) => {
      if (left.year !== right.year) {
        return right.year - left.year;
      }

      return right.month - left.month;
    });

  const lockedMonths = lockedRows.map((row) => ({
    key: `${row.year}-${row.month}`,
    label: formatMonthYear(row.month, row.year),
    lockedAt: row.lockedAt.toISOString(),
    lockedByName: row.lockedBy.name,
  }));

  return {
    availableMonths,
    lockedMonths,
  };
}

async function getOwnerTeamMembers() {
  return prisma.user.findMany({
    where: {
      role: UserRole.KARYAWAN,
      email: {
        notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

async function getOwnerWorkdayOverrides() {
  const minDate = addDays(startOfMonth(new Date()), -62);

  const rows = await prisma.workdayOverride.findMany({
    where: {
      date: {
        gte: minDate,
      },
    },
    orderBy: {
      date: "asc",
    },
    take: 24,
    select: {
      id: true,
      date: true,
      type: true,
      label: true,
      startTime: true,
      endTime: true,
      updatedAt: true,
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.date.toISOString(),
    type: row.type,
    label: row.label,
    startTime: row.startTime,
    endTime: row.endTime,
    updatedAt: row.updatedAt.toISOString(),
    createdByName: row.createdBy?.name ?? null,
  }));
}

async function getAttendanceSafeMonths() {
  const currentMonthStart = startOfMonth(new Date());
  const attendanceRows = await prisma.attendance.findMany({
    where: {
      date: {
        lt: currentMonthStart,
      },
    },
    select: {
      date: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  const monthKeys = new Set<string>();

  attendanceRows.forEach((row) => {
    const { year, month } = getAppDateParts(row.date);
    monthKeys.add(`${year}-${month}`);
  });

  return Array.from(monthKeys)
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: formatMonthYear(month, year),
      };
    })
    .slice(0, 12);
}
