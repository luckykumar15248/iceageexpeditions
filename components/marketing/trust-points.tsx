import Link from "next/link"

const points = [
  {
    index: "01",
    title: "Expedition-grade 4x4s and motorbike groups",
    body: "SUV journeys move as a guided convoy. Motorbike groups are self-ride, with the support vehicle in the line, not a rental brochure.",
  },
  {
    index: "02",
    title: "Support and backup trucks",
    body: "A support truck runs with motorbike departures unless that date says otherwise. It keeps the group moving. It is not a promise to rebuild a neglected bike at altitude.",
  },
  {
    index: "03",
    title: "Road captains",
    body: "The lead sets the day’s pace for daylight and the road that is actually open, and turns the group around when the pass is not.",
  },
  {
    index: "04",
    title: "Acclimatization and safety first",
    body: "Sleep altitudes are written into the itinerary. A fitness note is a self-declaration, not a medic’s clearance.",
    href: "/safety",
  },
] as const

export function TrustPoints() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {points.map((point) => (
        <article key={point.title} className="relative overflow-hidden rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(14,122,70,0.14)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-alpine" />
          <p className="font-display text-4xl font-bold text-alpine">{point.index}</p>
          <h3 className="mt-5 font-display text-2xl font-bold leading-snug text-ink">{point.title}</h3>
          <p className="mt-4 text-lg leading-relaxed text-muted">{point.body}</p>
          {"href" in point ? (
            <Link href={point.href} className="mt-5 inline-flex min-h-12 items-center text-lg font-semibold text-alpine-deep hover:underline">
              Read the safety notes
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  )
}
