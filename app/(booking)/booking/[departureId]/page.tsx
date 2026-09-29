import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import { OfflineNote } from "@/components/marketing/offline-note";
import { getBookableDeparture } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Request a departure",
  robots: { index: false, follow: false },
};

export default async function BookingPage({ params }: PageProps<"/booking/[departureId]">) {
  const { departureId } = await params;
  const departure = await getBookableDeparture(departureId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      {departure === "offline" ? <OfflineNote title="Booking is offline" /> : null}
      {departure === null ? (
        <>
          <h1 className="font-display text-5xl font-bold text-ink sm:text-6xl">Departure not found</h1>
          <Link href="/expeditions" className="mt-6 inline-flex text-lg font-semibold text-alpine-deep underline">
            Back to expeditions
          </Link>
        </>
      ) : null}
      {departure === "closed" ? (
        <>
          <h1 className="font-display text-5xl font-bold text-ink sm:text-6xl">This departure is not open</h1>
          <p className="mt-5 text-xl text-muted">It may be full, closed, or already underway. Ask from the route page instead.</p>
          <Link href="/expeditions" className="mt-8 inline-flex min-h-14 items-center rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep">
            See expeditions
          </Link>
        </>
      ) : null}
      {departure && departure !== "offline" && departure !== "closed" ? (
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <aside className="rounded-3xl border border-line border-l-4 border-l-alpine bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] lg:sticky lg:top-28">
            <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">{departure.vehicleLabel}</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">{departure.expeditionTitle}</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {departure.startLabel} – {departure.endLabel}. Meet at {departure.meetingPoint}. {departure.inventoryLabel}.
            </p>
            <p className="mt-5 text-2xl font-bold text-ink">
              {departure.priceLabel} per place · deposit {departure.depositLabel}
            </p>
            <p className="mt-4 text-lg text-muted">
              Sending this form creates a request. It does not capture a payment or confirm the seat.
            </p>
            <Link href={`/expeditions/${departure.expeditionSlug}`} className="mt-6 inline-flex text-lg font-semibold text-alpine-deep hover:underline">
              Back to the route
            </Link>
          </aside>
          <BookingForm
            departureId={departure.id}
            vehicleClass={departure.vehicleClass}
            policySnapshot={departure.policySnapshot}
          />
        </div>
      ) : null}
    </div>
  );
}
