import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  role: UserRole;
};

export async function getAuthState() {
  if (!isSupabaseConfigured()) {
    return {
      sessionUser: null,
      profile: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      sessionUser: null,
      profile: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      sessionUser: null,
      profile: null,
    };
  }

  const email = user.email.toLowerCase();
  const existingProfile = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!existingProfile) {
    return {
      sessionUser: user,
      profile: null,
    };
  }

  if (existingProfile.authUserId && existingProfile.authUserId !== user.id) {
    return {
      sessionUser: user,
      profile: null,
    };
  }

  const profile = existingProfile.authUserId
    ? existingProfile
    : await prisma.user.update({
        where: {
          id: existingProfile.id,
        },
        data: {
          authUserId: user.id,
        },
      });

  return {
    sessionUser: user,
    profile,
  };
}

export async function getCurrentUserProfile() {
  const authState = await getAuthState();
  return authState.profile as AuthenticatedUser | null;
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
