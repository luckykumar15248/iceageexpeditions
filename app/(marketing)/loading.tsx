export default function MarketingLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-busy="true" aria-live="polite">
      <p className="text-base leading-relaxed text-muted">Loading the route book…</p>
      <div className="mt-8 h-80 animate-pulse rounded-3xl bg-line" />
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="h-72 animate-pulse rounded-3xl bg-line" />
        <div className="h-72 animate-pulse rounded-3xl bg-line" />
        <div className="h-72 animate-pulse rounded-3xl bg-line" />
      </div>
    </div>
  );
}
