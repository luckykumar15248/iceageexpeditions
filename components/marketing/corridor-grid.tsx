import { ExpeditionImage } from "@/components/expedition-image"
import Link from "next/link"
import { corridors } from "@/lib/content"
import type { ExpeditionCard } from "@/lib/catalog"

const frames = ["lg:mt-14", "lg:mt-0", "lg:mt-8"] as const

function feetLabel(meters: number): string {
  return `${Math.round(meters * 3.28084).toLocaleString("en-IN")} ft`
}

export function CorridorGrid({ expeditions }: { expeditions: ExpeditionCard[] }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-3 lg:pb-14">
      {corridors.map((corridor, index) => {
        const published = expeditions.find((expedition) =>
          corridor.keywords.some((keyword) =>
            `${expedition.title} ${expedition.regionName} ${expedition.summary}`.toLowerCase().includes(keyword),
          ),
        )
        const href = published ? `/expeditions/${published.slug}#itinerary` : `/enquire?interest=${corridor.id}`
        return (
          <article
            key={corridor.id}
            className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_48px_rgba(14,122,70,0.16)] ${frames[index] ?? ""}`}
          >
            <div className={`relative overflow-hidden bg-line ${index === 1 ? "aspect-[4/5] lg:aspect-[4/5]" : "aspect-[16/11]"}`}>
              <ExpeditionImage
                src={corridor.image}
                alt={corridor.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover transition duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col gap-5 p-7 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-alpine px-3 py-1.5 text-sm font-semibold text-white">{corridor.kicker}</span>
                {published ? (
                  <>
                    <span className="rounded-full bg-alpine-soft px-3 py-1.5 text-sm font-semibold text-alpine-deep">
                      {published.durationDays} days
                    </span>
                    <span className="rounded-full bg-alpine-soft px-3 py-1.5 text-sm font-semibold text-alpine-deep">
                      {published.maxAltitudeMeters.toLocaleString("en-IN")} m · {feetLabel(published.maxAltitudeMeters)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-alpine-soft px-3 py-1.5 text-sm font-semibold text-alpine-deep">
                      Duration on request
                    </span>
                    <span className="rounded-full bg-alpine-soft px-3 py-1.5 text-sm font-semibold text-alpine-deep">
                      Altitude on the itinerary
                    </span>
                  </>
                )}
              </div>
              <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-ink sm:text-2xl">{corridor.title}</h3>
              <p className="text-base leading-relaxed text-muted">{corridor.body}</p>
              <Link
                href={href}
                className="mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep"
              >
                Explore itinerary
                <Arrow />
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 fill-none stroke-current stroke-2 transition-transform duration-300 ease-out group-hover:translate-x-1"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
