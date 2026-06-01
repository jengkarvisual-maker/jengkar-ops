import { redirect } from "next/navigation";

import { getCurrentUserProfile, hasLocalSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  if (await hasLocalSessionCookie()) {
    try {
      const profile = await getCurrentUserProfile();

      if (profile) {
        redirect("/dashboard");
      }
    } catch (error) {
      console.error("[ops-home] failed to resolve current user profile", error);
    }
  }

  redirect("/login");
}
