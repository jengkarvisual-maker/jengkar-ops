import Link from "next/link";

import { signOutAction } from "@/app/login/actions";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 md:px-8 md:py-8">
      <div className="w-full max-w-2xl rounded-[32px] border border-line bg-panel p-8 shadow-[var(--shadow-soft)]">
        <div className="inline-flex rounded-full border border-warning/15 bg-warning/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-warning">
          Akses ditolak
        </div>
        <h1 className="mt-5 font-serif text-4xl text-foreground">Akun Anda belum terhubung ke profil aplikasi.</h1>
        <p className="mt-4 text-base leading-8 text-muted">
          Hal ini biasanya terjadi jika akun Supabase Auth sudah aktif, tetapi email
          tersebut belum terdaftar pada tabel user aplikasi. Minta Owner atau Admin
          untuk menjalankan seed atau menambahkan profil Anda lebih dahulu.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 font-semibold transition hover:border-accent/30 hover:text-accent"
            href="/"
          >
            Kembali ke landing page
          </Link>
          <form action={signOutAction}>
            <button className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-semibold text-background transition hover:bg-foreground/90" type="submit">
              Keluar dari sesi ini
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
