export default function SettingsLoading() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
          <div className="space-y-4">
            <div className="h-7 w-32 animate-pulse rounded-full bg-accent/10" />
            <div className="h-4 w-36 animate-pulse rounded-full bg-line/80" />
            <div className="h-12 w-80 max-w-full animate-pulse rounded-full bg-line/80" />
            <div className="h-4 w-[26rem] max-w-full animate-pulse rounded-full bg-line/80" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.48fr_0.52fr]">
          {Array.from({ length: 2 }).map((_, index) => (
            <article
              className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-7"
              key={index}
            >
              <div className="h-7 w-28 animate-pulse rounded-full bg-accent/10" />
              <div className="mt-5 h-10 w-64 animate-pulse rounded-full bg-line/80" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-line/80" />
              <div className="mt-6 space-y-3">
                <div className="h-12 w-full animate-pulse rounded-2xl bg-line/80" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-line/80" />
                <div className="h-12 w-40 animate-pulse rounded-full bg-line/80" />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
