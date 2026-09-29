import { ExpeditionImage } from "@/components/expedition-image"
import Link from "next/link"
import { AvailabilityBadge } from "@/components/marketing/availability-badge"
import type { ExpeditionCard } from "@/lib/catalog"

export function ExpeditionCardView({ expedition }: { expedition: ExpeditionCard }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_48px_rgba(14,122,70,0.16)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-line">
        <ExpeditionImage
          src={expedition.heroImageUrl}
          alt={expedition.heroAlt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <AvailabilityBadge availability={expedition.availability} label={expedition.availabilityLabel} />
          {expedition.difficulty === "EXTREME" ? (
            <span className="inline-flex rounded-full bg-alpine px-3 py-1.5 text-sm font-semibold text-white">
              Extreme altitude
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-7 sm:p-8">
        <p className="text-base font-semibold text-alpine">
          {expedition.vehicleLabel} · {expedition.regionName}
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-ink">
          <Link href={`/expeditions/${expedition.slug}`} className="hover:text-alpine">
            {expedition.title}
          </Link>
        </h2>
        <dl className="grid grid-cols-2 gap-5 text-lg">
          <div>
            <dt className="text-base text-muted">Duration</dt>
            <dd className="font-semibold text-ink">{expedition.durationDays} days</dd>
          </div>
          <div>
            <dt className="text-base text-muted">Max altitude</dt>
            <dd className="font-semibold text-ink">{expedition.maxAltitudeMeters.toLocaleString("en-IN")} m</dd>
          </div>
          <div>
            <dt className="text-base text-muted">Difficulty</dt>
            <dd>
              <span className="inline-flex rounded-full bg-alpine-soft px-3 py-1.5 text-sm font-semibold text-alpine-deep">
                {expedition.difficultyLabel}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-base text-muted">From</dt>
            <dd className="font-semibold text-ink">{expedition.fromPriceLabel ?? "On enquiry"}</dd>
          </div>
        </dl>
        <Link
          href={`/expeditions/${expedition.slug}#itinerary`}
          className="mt-auto inline-flex min-h-14 items-center justify-center rounded-md bg-alpine px-5 text-lg font-semibold text-white hover:bg-alpine-deep"
        >
          View itinerary
        </Link>
      </div>
    </article>
  )
}
