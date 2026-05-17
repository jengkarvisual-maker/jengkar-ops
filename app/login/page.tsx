import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUserProfile, hasSupabaseSessionCookie } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage() {
  if (await hasSupabaseSessionCookie()) {
    const profile = await getCurrentUserProfile();

    if (profile) {
      redirect("/dashboard");
    }
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="ui-page-shell flex items-center justify-center">
      <section className="ui-panel w-full max-w-4xl p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          <Image
            alt="Logo Rumah Jengkar"
            className="h-[88px] w-[88px] object-contain md:h-[96px] md:w-[96px]"
            height={100}
            src="/rumah-jengkar-logo.png"
            width={100}
          />
          <div className="ui-pill mt-6">Jengkar KPI</div>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[0.94] tracking-[-0.05em] text-foreground md:text-6xl">
            Kita kaya bareng yuk?!
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted md:text-base">
            Masuk ke dashboard operasional Rumah Jengkar untuk absensi, progress kerja, KPI, dan bonus tim.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <LoginForm submitDisabled={!configured} />
        </div>
      </section>
    </main>
  );
}
