import Link from "next/link";

import { APP_NAME, APP_DOMAIN, CORE_MODULES, ROLE_COPY } from "@/lib/constants";

const productPrinciples = [
  "UI bersih, ringan, dan mudah dipakai di desktop maupun mobile.",
  "Semua dashboard dibedakan berdasarkan role agar akses tetap aman dan relevan.",
  "Prisma, Supabase, dan server-side guard disiapkan sejak fondasi supaya scaling tetap rapi.",
];

export function HomeScreen() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
        <section className="grid gap-8 border-b border-line/80 pb-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-accent/15 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Fondasi full-stack selaras kebutuhan KPI
            </div>
            <div className="space-y-4">
              <p className="font-mono text-sm text-muted">{APP_DOMAIN.replace("https://", "")}</p>
              <h1 className="font-serif text-4xl leading-tight text-balance md:text-6xl">
                {APP_NAME} menjadi pusat absensi, progres harian, KPI, dan bonus tahunan.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-muted">
                Fondasi ini sekarang disusun untuk kebutuhan operasional kreatif Rumah
                Jengkar: role Owner, Admin, dan Karyawan; koneksi ke Supabase;
                schema Prisma; dashboard berbasis data; serta aturan bisnis KPI dan
                bonus yang siap dipakai sebagai dasar pengembangan modul berikutnya.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90"
                href="/login"
              >
                Masuk ke aplikasi
              </Link>
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-6 text-sm font-semibold transition hover:border-accent/30 hover:text-accent"
                href="https://rumahjengkar.com"
                rel="noreferrer"
                target="_blank"
              >
                Buka portal utama
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[28px] border border-line bg-surface p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Siap dipakai sebagai fondasi
              </p>
              <p className="mt-4 font-serif text-3xl text-foreground">
                Database, auth, guard, dan dashboard dasar sudah disiapkan.
              </p>
              <p className="mt-3 text-sm leading-7 text-muted">
                Artinya repo ini tidak lagi sekadar landing page, tetapi sudah menjadi
                pondasi aplikasi KPI yang relevan dengan kebutuhan bisnis Anda.
              </p>
            </article>
            <article className="rounded-[28px] border border-line bg-foreground p-5 text-background">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/75">
                Tiga role utama
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-background/88">
                {Object.values(ROLE_COPY).map((role) => (
                  <div key={role.label}>
                    <p className="font-semibold text-background">{role.label}</p>
                    <p>{role.description}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-10 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Modul inti
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">
              Area kerja yang menjadi fondasi produk
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CORE_MODULES.map((module) => (
              <article className="rounded-[24px] border border-line bg-surface p-5" key={module.title}>
                <p className="text-lg font-semibold text-foreground">{module.title}</p>
                <p className="mt-3 text-sm leading-7 text-muted">{module.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[28px] border border-line bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Prinsip pengerjaan
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              {productPrinciples.map((principle) => (
                <p key={principle}>{principle}</p>
              ))}
            </div>
          </article>
          <article className="rounded-[28px] border border-line bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Status fondasi saat ini
            </p>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex size-9 items-center justify-center rounded-full border border-line bg-background font-mono text-xs">
                  01
                </div>
                <p className="pt-1 text-sm leading-7 text-muted">
                  Prisma schema mencakup User, Attendance, DailyProgress, KpiMonthly,
                  KpiYearly, dan CompanyFinance.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex size-9 items-center justify-center rounded-full border border-line bg-background font-mono text-xs">
                  02
                </div>
                <p className="pt-1 text-sm leading-7 text-muted">
                  Supabase Auth, seed user internal, dan route guard sisi server sudah
                  diposisikan sebagai pola dasar aplikasi.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex size-9 items-center justify-center rounded-full border border-line bg-background font-mono text-xs">
                  03
                </div>
                <p className="pt-1 text-sm leading-7 text-muted">
                  Dashboard Owner, Admin, dan Karyawan sudah punya struktur data dan
                  empty state yang siap dihubungkan ke modul operasional berikutnya.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
