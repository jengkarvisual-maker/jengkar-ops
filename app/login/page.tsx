import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { APP_NAME, CORE_MODULES } from "@/lib/constants";
import { getCurrentUserProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect("/dashboard");
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
          <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Login internal
          </div>
          <h1 className="mt-5 font-serif text-4xl leading-tight text-balance md:text-5xl">
            Masuk ke {APP_NAME} untuk mengelola absensi, progres, KPI, dan bonus tim.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            Akses dibagi menjadi Owner, Admin, dan Karyawan. Setiap peran melihat
            dashboard yang sesuai dengan tanggung jawabnya, dengan pengamanan route
            dan data di sisi server.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CORE_MODULES.map((module) => (
              <article
                className="rounded-[24px] border border-line bg-surface p-5"
                key={module.title}
              >
                <p className="text-lg font-semibold text-foreground">{module.title}</p>
                <p className="mt-3 text-sm leading-7 text-muted">{module.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted">
            <a
              className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 font-semibold transition hover:border-accent/30 hover:text-accent"
              href="https://rumahjengkar.com"
              rel="noreferrer"
              target="_blank"
            >
              Kembali ke portal Rumah Jengkar
            </a>
          </div>
        </section>

        <section className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Akses akun
            </p>
            <h2 className="font-serif text-3xl text-foreground">Masuk dengan email kerja</h2>
            <p className="text-sm leading-7 text-muted">
              Gunakan akun Supabase Auth yang sudah diaktifkan. Seed dasar menyiapkan
              daftar user aplikasi, dan service role dapat dipakai untuk membuat akun
              auth secara otomatis.
            </p>
          </div>

          {!configured ? (
            <div className="mt-6 rounded-[24px] border border-pending/20 bg-pending/8 p-5 text-sm leading-7 text-foreground">
              <p className="font-semibold text-pending">Supabase belum terkoneksi.</p>
              <p className="mt-2 text-muted">
                Isi <code className="rounded bg-white px-1.5 py-0.5">DATABASE_URL</code>,
                <code className="ml-1 rounded bg-white px-1.5 py-0.5">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>
                , dan
                <code className="ml-1 rounded bg-white px-1.5 py-0.5">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>
                untuk mulai memakai auth dan database.
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <LoginForm disabled={!configured} />
          </div>
        </section>
      </div>
    </main>
  );
}
