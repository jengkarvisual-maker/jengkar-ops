import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect("/dashboard");
  }

  redirect("/login");
}
