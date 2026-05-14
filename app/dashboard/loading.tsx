export default function DashboardLoading() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-line bg-panel/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
          <div className="space-y-4">
            <div className="h-7 w-28 animate-pulse rounded-full bg-accent/10" />
            <div className="h-4 w-36 animate-pulse rounded-full bg-line/80" />
            <div className="h-12 w-80 max-w-full animate-pulse rounded-full bg-line/80" />
            <div className="h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-line/80" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              className="rounded-[24px] border border-line bg-surface p-5"
              key={index}
            >
              <div className="h-7 w-28 animate-pulse rounded-full bg-line/80" />
              <div className="mt-4 h-10 w-24 animate-pulse rounded-full bg-line/80" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-line/80" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
