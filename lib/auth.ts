import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getLocalSessionUserId } from "@/lib/session";
import { findUserByIdWithArchiveState } from "@/lib/user-archiving";

export type AuthenticatedUser = {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export const getAuthState = cache(async () => {
  const userId = await getLocalSessionUserId();

  if (!userId) {
    return {
      sessionUser: null,
      profile: null,
    };
  }

  const profile = await findUserByIdWithArchiveState(userId);

  if (!profile?.isActive) {
    return {
      sessionUser: null,
      profile: null,
    };
  }

  return {
    sessionUser: {
      id: profile.id,
      email: profile.email,
    },
    profile,
  };
});

export async function getCurrentUserProfile() {
  const authState = await getAuthState();
  return authState.profile as AuthenticatedUser | null;
}

export async function hasLocalSessionCookie() {
  return Boolean(await getLocalSessionUserId());
}

export async function requireAuthenticatedUser() {
  const authState = await getAuthState();

  if (!authState.sessionUser) {
    redirect("/login");
  }

  if (!authState.profile) {
    redirect("/unauthorized");
  }

  return authState.profile as AuthenticatedUser;
}

export function canManageProgress(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canManageFinance(role: UserRole) {
  return role === UserRole.OWNER;
}

export function canResetManagedPasswords(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canResetTargetUserPassword(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === UserRole.OWNER) {
    return targetRole === UserRole.ADMIN || targetRole === UserRole.KARYAWAN;
  }

  if (actorRole === UserRole.ADMIN) {
    return targetRole === UserRole.KARYAWAN;
  }

  return false;
}
