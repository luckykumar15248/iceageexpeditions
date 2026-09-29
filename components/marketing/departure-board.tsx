import Link from "next/link"
import type { DepartureRow } from "@/lib/catalog"

export function DepartureBoard({
  departures,
  vehicleLabel,
}: {
  departures: DepartureRow[]
  vehicleLabel: string
}) {
  const open = departures.filter((departure) => departure.bookable)
  if (departures.length === 0) {
    return (
      <section id="departures" className="scroll-mt-36">
        <h2 className="font-display text-4xl font-bold text-ink sm:text-5xl">Dated departures</h2>
        <p className="mt-4 text-lg text-muted">No dated departure is published for this route yet. Use the quote form below.</p>
      </section>
    )
  }

  return (
    <section id="departures" aria-labelledby="departures-heading" className="scroll-mt-40">
      <h2 id="departures-heading" className="font-display text-4xl font-bold text-ink sm:text-5xl">
        Dated departures
      </h2>
      <p className="mt-4 max-w-3xl text-lg text-muted">
        Prices are per {vehicleLabel === "Motorbike" ? "rider slot" : "SUV seat"}, shown in INR. A full batch stays on
        the list and cannot be requested.
      </p>
      <div className="mt-6 grid gap-4 md:hidden">
        {departures.map((departure) => (
          <DepartureCard key={departure.id} departure={departure} />
        ))}
      </div>
      <div className="mt-8 hidden overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] md:block">
        <table className="w-full border-collapse text-left text-lg">
          <caption className="sr-only">Departure dates, remaining places, and prices</caption>
          <thead className="bg-canvas text-muted">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">Dates</th>
              <th scope="col" className="px-6 py-4 font-semibold">Meet</th>
              <th scope="col" className="px-6 py-4 font-semibold">Places</th>
              <th scope="col" className="px-6 py-4 font-semibold">Price</th>
              <th scope="col" className="px-6 py-4 font-semibold">Status</th>
              <th scope="col" className="px-6 py-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {departures.map((departure) => (
              <tr key={departure.id} className="border-t border-line align-top text-ink">
                <td className="px-6 py-5">
                  {departure.startLabel} – {departure.endLabel}
                </td>
                <td className="px-6 py-5">{departure.meetingPoint}</td>
                <td className="px-6 py-5">{departure.inventoryLabel}</td>
                <td className="px-6 py-5">
                  <span className="font-semibold">{departure.priceLabel}</span>
                  <span className="block text-muted">Deposit {departure.depositLabel}</span>
                </td>
                <td className="px-6 py-5">
                  <StatusBadge departure={departure} />
                </td>
                <td className="px-6 py-5">
                  <DepartureAction departure={departure} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open.length === 0 ? (
        <p className="mt-5 text-lg text-muted">No batch is open for a new request. Use the enquiry form below.</p>
      ) : null}
    </section>
  )
}

function DepartureCard({ departure }: { departure: DepartureRow }) {
  return (
    <article className="rounded-3xl border border-line bg-paper p-7 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-2xl font-bold text-ink">
          {departure.startLabel} – {departure.endLabel}
        </p>
        <StatusBadge departure={departure} />
      </div>
      <p className="mt-3 text-lg text-muted">{departure.meetingPoint}</p>
      <p className="mt-4 text-lg font-semibold text-ink">{departure.inventoryLabel}</p>
      <p className="text-lg text-ink">
        {departure.priceLabel} <span className="text-muted">· deposit {departure.depositLabel}</span>
      </p>
      <div className="mt-4">
        <DepartureAction departure={departure} />
      </div>
    </article>
  )
}

function StatusBadge({ departure }: { departure: DepartureRow }) {
  const thin =
    departure.bookable &&
    departure.capacity > 0 &&
    (departure.seatsRemaining <= 2 || departure.seatsRemaining / departure.capacity <= 0.25)
  const label = departure.bookable
    ? thin
      ? "Limited slots"
      : "Open"
    : departure.status === "FULL"
      ? "Sold out"
      : departure.status === "CLOSED"
        ? "Waitlist"
        : departure.statusLabel
  const className = departure.bookable
    ? thin
      ? "bg-alpine-soft text-alpine-deep"
      : "bg-alpine text-white"
    : departure.status === "FULL"
      ? "bg-ink text-white"
      : "bg-canvas text-muted ring-1 ring-line"
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${className}`}>{label}</span>
}

function DepartureAction({ departure }: { departure: DepartureRow }) {
  if (departure.bookable) {
    return (
      <Link
        href={`/booking/${departure.id}`}
        className="inline-flex min-h-14 items-center rounded-md bg-alpine px-5 text-lg font-semibold text-white hover:bg-alpine-deep"
      >
        Request to book
      </Link>
    )
  }
  if (departure.status === "FULL" || departure.status === "CLOSED") {
    return (
      <a
        href="#enquire"
        className="inline-flex min-h-14 items-center rounded-md border border-alpine px-5 text-lg font-semibold text-alpine-deep"
      >
        Request a quote
      </a>
    )
  }
  return <span className="text-muted">Not open</span>
}
