"use server";

import { hashPassword, getLegacySeedPassword, verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { clearLocalSession, createLocalSession } from "@/lib/session";
import { findUserByEmailWithArchiveState } from "@/lib/user-archiving";

export type LoginActionState = {
  error: string | null;
  redirectTo?: string | null;
};

export type SignOutActionState = {
  error: string | null;
  redirectTo?: string | null;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      error: "Email dan password wajib diisi.",
      redirectTo: null,
    };
  }

  const existingProfile = await findUserByEmailWithArchiveState(email);

  if (!existingProfile) {
    return {
      error: "Login gagal. Pastikan email dan password sudah benar.",
      redirectTo: null,
    };
  }

  if (!existingProfile.isActive) {
    return {
      error:
        "Akun ini sudah dinonaktifkan dari tim aktif Rumah Jengkar. Hubungi owner atau admin bila masih perlu akses.",
      redirectTo: null,
    };
  }

  const userWithPassword = await prisma.user.findUnique({
    where: {
      id: existingProfile.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!userWithPassword) {
    return {
      error: "Login gagal. Pastikan email dan password sudah benar.",
      redirectTo: null,
    };
  }

  const isPasswordValid = verifyPassword(password, userWithPassword.passwordHash);
  const legacySeedPassword = getLegacySeedPassword(email);
  const isLegacySeedPasswordValid =
    !userWithPassword.passwordHash && legacySeedPassword === password;

  if (!isPasswordValid && !isLegacySeedPasswordValid) {
    return {
      error: "Login gagal. Pastikan email dan password sudah benar.",
      redirectTo: null,
    };
  }

  if (isLegacySeedPasswordValid) {
    await prisma.user.update({
      where: {
        id: userWithPassword.id,
      },
      data: {
        passwordHash: hashPassword(password),
      },
    });
  }

  await createLocalSession(existingProfile.id);

  return {
    error: null,
    redirectTo: "/dashboard",
  };
}

export async function signOutAction(): Promise<SignOutActionState> {
  await clearLocalSession();

  return {
    error: null,
    redirectTo: "/login",
  };
}
