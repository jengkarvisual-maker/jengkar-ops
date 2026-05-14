import { redirect } from "next/navigation";
import { Bebas_Neue } from "next/font/google";

import { LoginForm } from "@/components/login-form";
import { getCurrentUserProfile, hasSupabaseSessionCookie } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

const fontDisplay = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

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
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-4xl rounded-[36px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
        <div className="flex flex-col items-center text-center">
          <img
            alt="Logo Rumah Jengkar"
            className="h-[100px] w-[100px] object-contain"
            height={100}
            src="/rumah-jengkar-logo.png"
            width={100}
          />
          <h1
            className={`${fontDisplay.className} mt-6 text-5xl uppercase leading-none tracking-[0.03em] text-foreground md:text-7xl`}
          >
            Kita kaya bareng yuk?!
          </h1>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <LoginForm submitDisabled={!configured} />
        </div>
      </section>
    </main>
  );
}
