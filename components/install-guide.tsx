import Image from "next/image";

const INSTALL_GUIDES = [
  {
    title: "Android",
    steps: [
      "Buka ops.rumahjengkar.com di Chrome.",
      "Tekan tombol Install saat banner muncul.",
      "Kalau banner tidak muncul, buka menu Chrome lalu pilih Install app atau Add to Home screen.",
    ],
  },
  {
    title: "iPhone",
    steps: [
      "Buka ops.rumahjengkar.com di Safari.",
      "Tekan tombol Share.",
      "Pilih Add to Home Screen lalu tekan Add.",
    ],
  },
  {
    title: "Windows",
    steps: [
      "Buka ops.rumahjengkar.com di Chrome atau Microsoft Edge.",
      "Klik ikon Install di address bar, atau buka menu browser lalu pilih Install HARI INI NGAPAIN.",
      "Setelah terpasang, buka app dari Start Menu atau Taskbar.",
    ],
  },
  {
    title: "Mac",
    steps: [
      "Buka ops.rumahjengkar.com di Safari.",
      "Tekan Share lalu pilih Add to Dock.",
      "App akan muncul di Dock dan Applications seperti program biasa.",
    ],
  },
] as const;

export function InstallGuide() {
  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-[30px] border border-line bg-surface/90 p-5 shadow-[var(--shadow-soft)] md:p-6">
      <div className="flex items-center gap-3">
        <Image
          alt="Icon HARI INI NGAPAIN"
          className="h-14 w-14 rounded-[18px] border border-line object-cover"
          height={56}
          src="/icons/icon-192.png"
          width={56}
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Install App
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground md:text-2xl">
            Pasang HARI INI NGAPAIN di perangkat Anda
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {INSTALL_GUIDES.map((guide) => (
          <article
            key={guide.title}
            className="rounded-[24px] border border-line bg-white/80 p-4"
          >
            <h3 className="text-base font-semibold text-foreground">{guide.title}</h3>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        Jika icon lama masih muncul, hapus dulu app lama dari perangkat lalu install ulang agar icon
        dan splash screen terbaru ikut terpakai.
      </p>
    </section>
  );
}
