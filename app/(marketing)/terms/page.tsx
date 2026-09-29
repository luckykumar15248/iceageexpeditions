import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "How an Ice Age Expeditions request becomes a departure, and what the site does not promise.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Trust</p>
      <h1 className="mt-3 font-display text-5xl font-bold text-ink sm:text-7xl">Terms and conditions</h1>
      <div className="mt-8 space-y-5 rounded-3xl border border-line bg-paper p-8 text-lg leading-relaxed text-muted shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-10">
        <p>
          Ice Age Expeditions publishes Himalayan routes as two vehicle classes: a guided 4x4 SUV convoy, and a
          self-ride motorbike group with a support vehicle. Sending an enquiry or a booking request does not capture a
          payment and does not confirm a seat or a bike slot.
        </p>
        <p>
          A departure is bookable only when it shows a start date, capacity, price, meeting point, and cancellation
          terms. Ops can refuse or reschedule when the road, a permit window, or acclimatization requires it. The site
          does not promise that a pass will be open.
        </p>
        <p>
          Prices are in INR. The amount on the departure is the one that applies. Fitness notes are self-declarations,
          not a doctor’s clearance.
        </p>
        <p>
          Questions about a file go through the{" "}
          <Link href="/contact" className="font-semibold text-alpine-deep underline">
            contact desk
          </Link>
          . The phone and email for that file are the ones ops sends with the departure.
        </p>
      </div>
    </div>
  );
}
