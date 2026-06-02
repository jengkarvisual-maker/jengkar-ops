import { redirect } from "next/navigation";

import { getCurrentUserProfile, hasLocalSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  if (await hasLocalSessionCookie()) {
    let profile = null;

    try {
      profile = await getCurrentUserProfile();
    } catch (error) {
      console.error("[ops-home] failed to resolve current user profile", error);
    }

    if (profile) {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
