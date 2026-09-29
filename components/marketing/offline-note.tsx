export function OfflineNote({
  title = "The route book is offline",
  page = false,
}: {
  title?: string
  page?: boolean
}) {
  const Heading = page ? "h1" : "h2"
  return (
    <div className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]" role="status">
      <Heading className="font-display text-3xl font-bold text-ink">{title}</Heading>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
        We could not read published departures just now. The safety, gear, and FAQ pages are still available. Retry this
        page in a moment.
      </p>
    </div>
  )
}
