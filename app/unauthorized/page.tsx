import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

export default function UnauthorizedPage() {
  return (
    <main className="ui-page-shell flex items-center justify-center">
      <div className="ui-panel w-full max-w-2xl p-8">
        <div className="inline-flex rounded-full border border-warning/15 bg-warning/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-warning">
          Akses ditolak
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-foreground">Akun Anda belum terhubung ke profil aplikasi.</h1>
        <p className="mt-4 text-base leading-8 text-muted">
          Hal ini biasanya terjadi jika sesi login lokal aktif, tetapi profil user belum
          tersedia atau sudah dinonaktifkan pada database OPS. Minta Owner atau Admin
          untuk mengecek status akun Anda.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="button-press ui-button-secondary"
            href="/"
          >
            Kembali ke landing page
          </Link>
          <SignOutButton
            className="button-press ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            label="Keluar dari sesi ini"
            pendingLabel="Keluar..."
          />
        </div>
      </div>
    </main>
  );
}
