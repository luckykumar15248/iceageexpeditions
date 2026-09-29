import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Booking policies",
  description: "Deposits, full batches, and cancellation terms for Ice Age Expeditions departures.",
  alternates: { canonical: "/booking-policies" },
};

export default function BookingPoliciesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Trust</p>
      <h1 className="mt-3 font-display text-5xl font-bold text-ink sm:text-7xl">Booking policies</h1>
      <div className="mt-8 space-y-5 rounded-3xl border border-line bg-paper p-8 text-lg leading-relaxed text-muted shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-10">
        <p>
          A booking request holds a request, not a captured payment. Ops accepts it only when the departure is open and
          the seats or bike slots are still there. The deposit and the balance are the amounts shown on that departure,
          in INR.
        </p>
        <p>
          A full batch stays visible and cannot be requested. Use the waitlist on that expedition. If a pass closes,
          ops can cancel or move the date and will record the reason. The cancellation window is the one written on
          that departure before you send the request.
        </p>
        <p>
          Pillions do not take a second bike slot unless that departure says they do. SUV seats and motorbike slots are
          counted separately.
        </p>
        <p>
          Read the{" "}
          <Link href="/faq" className="font-semibold text-alpine-deep underline">
            FAQ
          </Link>{" "}
          for deposits and closed roads, or{" "}
          <Link href="/enquire" className="font-semibold text-alpine-deep underline">
            ask the desk
          </Link>{" "}
          about a date that is not on the board.
        </p>
      </div>
    </div>
  );
}
