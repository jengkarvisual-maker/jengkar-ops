import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#090909] px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.04),transparent_22%)]" />
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="splash-pulse rounded-[36px] border border-white/10 bg-white/6 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <Image
            alt="HARI INI NGAPAIN"
            className="h-28 w-28 rounded-[28px] object-cover"
            height={112}
            src="/icons/icon-512.png"
            width={112}
          />
        </div>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.45em] text-white/65">
          Rumah Jengkar
        </p>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.08em] text-white">
          HARI INI NGAPAIN
        </h1>
        <div className="mt-5 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-white/90 [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-white/70 [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-white/55" />
        </div>
      </div>
    </main>
  );
}
