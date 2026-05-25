import { type Prisma, UserRole } from "@prisma/client";
import { cache } from "react";

import { EXCLUDED_OPERATIONAL_EMAILS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type UserArchiveAwareRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authUserId: string | null;
  isActive: boolean;
};

export const hasUserArchivingColumns = cache(async () => {
  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'User'
        AND column_name IN ('isActive', 'archivedAt')
    `;

    const availableColumns = new Set(rows.map((row) => row.column_name));
    return availableColumns.has("isActive") && availableColumns.has("archivedAt");
  } catch (error) {
    console.error("[user-archiving] failed to inspect schema columns", error);
    return false;
  }
});

export async function buildActiveKaryawanWhere(userId?: string): Promise<Prisma.UserWhereInput> {
  const where: Prisma.UserWhereInput = {
    role: UserRole.KARYAWAN,
    email: {
      notIn: [...EXCLUDED_OPERATIONAL_EMAILS],
    },
  };

  if (userId) {
    where.id = userId;
  }

  if (await hasUserArchivingColumns()) {
    where.isActive = true;
  }

  return where;
}

export async function buildResettableUsersWhere(role: UserRole): Promise<Prisma.UserWhereInput> {
  const where: Prisma.UserWhereInput =
    role === UserRole.OWNER
      ? {
          role: {
            in: [UserRole.ADMIN, UserRole.KARYAWAN],
          },
        }
      : {
          role: UserRole.KARYAWAN,
        };

  if (await hasUserArchivingColumns()) {
    where.isActive = true;
  }

  return where;
}

export async function findUserByEmailWithArchiveState(
  email: string,
): Promise<UserArchiveAwareRecord | null> {
  if (await hasUserArchivingColumns()) {
    return prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authUserId: true,
        isActive: true,
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      authUserId: true,
    },
  });

  return user
    ? {
        ...user,
        isActive: true,
      }
    : null;
}

