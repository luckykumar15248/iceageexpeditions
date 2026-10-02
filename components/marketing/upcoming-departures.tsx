import { ExpeditionImage } from "@/components/expedition-image"
import Link from "next/link"
import { OfflineNote } from "@/components/marketing/offline-note"
import type { UpcomingDepartureCard } from "@/lib/catalog"

export function UpcomingDepartures({ departures }: { departures: UpcomingDepartureCard[] | "offline" }) {
  if (departures === "offline") {
    return <OfflineNote title="Upcoming dates are offline" />
  }
  if (departures.length === 0) {
    return (
      <p className="max-w-xl text-muted">
        No departure is open. Ask about a corridor above. Ops answers when a date, a vehicle, and the permit window are
        real.
      </p>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {departures.map((departure) => (
        <article key={departure.id} className="flex w-[22rem] shrink-0 overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
          <div className="relative w-28 shrink-0 bg-line">
            <ExpeditionImage src={departure.heroImageUrl} alt={departure.heroAlt} fill sizes="112px" className="object-cover" />
          </div>
          <div className="flex flex-1 flex-col p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-alpine">{departure.vehicleLabel}</p>
            <h3 className="mt-1 font-display text-base font-bold leading-tight text-ink">{departure.title}</h3>
            <p className="mt-2 text-sm text-muted">
              {departure.startLabel} – {departure.endLabel}
            </p>
            <p className={`mt-1 text-sm font-semibold ${departure.scarce ? "text-alpine-deep" : "text-ink"}`}>
              {departure.placesNote}
            </p>
            <p className="text-sm text-ink">{departure.priceLabel}</p>
            <Link
              href={`/booking/${departure.id}`}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-alpine px-3 text-sm font-semibold text-white hover:bg-alpine-deep"
            >
              Book slot
            </Link>
            <p className="mt-1 text-xs text-muted">A request. Payment is not taken on this page.</p>
          </div>
        </article>
      ))}
    </div>
  )
}
