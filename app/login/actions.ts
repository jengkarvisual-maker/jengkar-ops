"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  if (!isSupabaseConfigured()) {
    return {
      error: "Konfigurasi Supabase belum lengkap. Isi environment terlebih dahulu.",
      redirectTo: null,
    };
  }

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

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Klien auth belum siap. Cek kembali environment Supabase Anda.",
      redirectTo: null,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Login gagal. Pastikan email dan password sudah benar.",
      redirectTo: null,
    };
  }

  return {
    error: null,
    redirectTo: "/dashboard",
  };
}

export async function signOutAction(): Promise<SignOutActionState> {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return {
    error: null,
    redirectTo: "/login",
  };
}
