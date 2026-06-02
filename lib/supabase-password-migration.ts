import { createClient } from "@supabase/supabase-js";

export async function verifyLegacySupabasePassword(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[ops-login] legacy Supabase password bridge is not configured");
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn("[ops-login] legacy Supabase password rejected", {
        email,
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("[ops-login] legacy Supabase password bridge failed", error);
    return false;
  }
}
