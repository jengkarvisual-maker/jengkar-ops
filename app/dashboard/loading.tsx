export default function DashboardLoading() {
  return (
    <main className="ui-page-shell">
      <div className="ui-page-container space-y-5">
        <section className="ui-panel p-5 md:p-6">
          <div className="space-y-4">
            <div className="h-7 w-28 animate-pulse rounded-full bg-foreground/8" />
            <div className="h-4 w-36 animate-pulse rounded-full bg-line/80" />
            <div className="h-12 w-80 max-w-full animate-pulse rounded-full bg-line/80" />
            <div className="h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-line/80" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              className="ui-card p-4 md:p-5"
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
