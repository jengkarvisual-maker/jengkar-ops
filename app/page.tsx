import { redirect } from "next/navigation";

import { getCurrentUserProfile, hasSupabaseSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  if (await hasSupabaseSessionCookie()) {
    const profile = await getCurrentUserProfile();

    if (profile) {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
