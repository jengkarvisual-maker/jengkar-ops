import Link from "next/link";

const ecosystemApps = [
  {
    name: "Portal Rumah Jengkar",
    href: "https://rumahjengkar.com",
    domain: "rumahjengkar.com",
    description: "Landing page utama untuk masuk ke seluruh aplikasi inti Rumah Jengkar.",
  },
  {
    name: "JEPAT",
    href: "https://jepat.rumahjengkar.com",
    domain: "jepat.rumahjengkar.com",
    description: "Pelacakan emosi, Human Design, dan rekomendasi reflektif tim.",
  },
  {
    name: "Finance",
    href: "https://finance.rumahjengkar.com",
    domain: "finance.rumahjengkar.com",
    description: "Ruang kerja keuangan untuk transaksi, arus kas, dan laporan usaha.",
  },
];

const modules = [
  {
    title: "Pusat SOP",
    status: "Fondasi siap",
    description:
      "Disiapkan untuk struktur dokumen prosedur, kategori tim, pemilik dokumen, dan versi revisi.",
  },
  {
    title: "Ruang KPI",
    status: "Fondasi siap",
    description:
      "Disiapkan untuk target bulanan, indikator utama, review performa, dan catatan tindak lanjut.",
  },
  {
    title: "Bonus Tahunan",
    status: "Tahap awal",
    description:
      "Disiapkan untuk formula bonus, baseline capaian, dan kaitan lembut dengan hasil KPI tahunan.",
  },
  {
    title: "Review Operasional",
    status: "Tahap awal",
    description:
      "Disiapkan untuk ritme review mingguan, checkpoint lintas divisi, dan rangkuman keputusan kerja.",
  },
];

const milestones = [
  "Menambahkan autentikasi owner dan member untuk akses operasional yang lebih rapi.",
  "Membuat master divisi, role, dan siklus penilaian sebagai fondasi data inti.",
  "Menyusun modul KPI per periode serta relasinya ke evaluasi dan bonus tahunan.",
  "Menyiapkan ruang SOP dengan status dokumen, PIC, dan histori pembaruan.",
];

export function HomeScreen() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-line bg-panel/90 p-6 shadow-soft backdrop-blur md:p-10">
        <section className="grid gap-8 border-b border-line/80 pb-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Fondasi aplikasi ketiga
            </div>
            <div className="space-y-4">
              <p className="font-mono text-sm text-muted">ops.rumahjengkar.com</p>
              <h1 className="font-serif text-4xl leading-tight text-balance text-foreground md:text-6xl">
                Jengkar KPI disiapkan sebagai ruang operasional untuk SOP, target,
                dan bonus tahunan.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-muted">
                Halaman ini menjadi fondasi online awal untuk aplikasi operasional
                Rumah Jengkar. Fokus tahap sekarang adalah menyiapkan struktur
                produk, navigasi lintas aplikasi, serta halaman publik yang rapi
                sebelum modul data dan autentikasi dibangun lebih dalam.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/88"
                href="https://rumahjengkar.com"
              >
                Kembali ke portal utama
              </Link>
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-6 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:bg-accent/8"
                href="#modul"
              >
                Lihat modul fondasi
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[28px] border border-line bg-surface p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/85">
                Status saat ini
              </p>
              <p className="mt-4 font-serif text-3xl text-foreground">
                Online sebagai fondasi awal
              </p>
              <p className="mt-3 text-sm leading-7 text-muted">
                Domain operasional kini sudah disiapkan sebagai tempat awal untuk
                membangun modul SOP, KPI, review, dan bonus tahunan secara
                bertahap.
              </p>
            </article>
            <article className="rounded-[28px] border border-line bg-foreground p-5 text-background">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/70">
                Fokus berikutnya
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-background/88">
                <li>Struktur data owner, divisi, dan siklus KPI.</li>
                <li>Ruang SOP dengan pengelompokan dokumen dan PIC.</li>
                <li>Relasi KPI ke bonus tahunan dan review periodik.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="mt-10 space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Ekosistem aplikasi
              </p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">
                Navigasi lintas aplikasi Rumah Jengkar
              </h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {ecosystemApps.map((app) => (
              <a
                className="rounded-[24px] border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-soft"
                href={app.href}
                key={app.name}
              >
                <p className="text-lg font-semibold text-foreground">{app.name}</p>
                <p className="mt-1 font-mono text-xs text-muted">{app.domain}</p>
                <p className="mt-4 text-sm leading-7 text-muted">{app.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-5" id="modul">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Modul fondasi
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">
              Area kerja yang disiapkan dari awal
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => (
              <article
                className="rounded-[24px] border border-line bg-surface p-5"
                key={module.title}
              >
                <div className="inline-flex rounded-full border border-accent/18 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {module.status}
                </div>
                <p className="mt-4 text-lg font-semibold text-foreground">
                  {module.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {module.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[28px] border border-line bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Prinsip produk
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                Fondasi aplikasi ini dibuat agar pertumbuhan modul operasional
                tetap sederhana, mudah dipahami tim, dan konsisten dengan domain
                custom Rumah Jengkar.
              </p>
              <p>
                Tahap awal ini belum memaksakan kompleksitas yang belum dibutuhkan.
                Fokusnya adalah ruang kerja yang siap dikembangkan secara bertahap
                tanpa membuat struktur teknis berantakan.
              </p>
            </div>
          </article>
          <article className="rounded-[28px] border border-line bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Milestone berikutnya
            </p>
            <div className="mt-5 space-y-4">
              {milestones.map((milestone, index) => (
                <div className="flex gap-4" key={milestone}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-background font-mono text-xs text-foreground">
                    0{index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-7 text-muted">{milestone}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
