const logs = [
  {
    kicker: "The road",
    quote: "High roads close for snow, slides, and local orders. We do not promise an open pass.",
  },
  {
    kicker: "The night",
    quote: "Sleep altitudes are part of the itinerary. Extra nights are planned in, not offered after someone feels sick.",
  },
  {
    kicker: "The convoy",
    quote: "Motorbike groups travel with a support truck unless a departure says otherwise. SUV journeys move as a guided convoy.",
  },
] as const

export function TrailLogs() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {logs.map((log) => (
        <figure key={log.kicker} className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(14,122,70,0.14)]">
          <figcaption className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">{log.kicker}</figcaption>
          <blockquote className="mt-5 font-display text-3xl font-bold leading-snug text-ink">“{log.quote}”</blockquote>
          <p className="mt-5 text-lg text-muted">Ice Age Expeditions desk. Rider reviews are added when a traveler sends one we can name.</p>
        </figure>
      ))}
    </div>
  )
}
