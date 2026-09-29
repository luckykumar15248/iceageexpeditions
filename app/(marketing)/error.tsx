"use client";

export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Ice Age Expeditions</p>
      <h1 className="mt-4 font-display text-5xl font-bold text-ink sm:text-6xl">The expedition desk hit a problem</h1>
      <p className="mt-5 text-xl leading-relaxed text-muted">
        This page could not be finished. Retry, or read the safety notes and send an enquiry once the route book is back.
      </p>
      <button type="button" onClick={reset} className="mt-8 min-h-14 rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep">
        Try again
      </button>
    </section>
  );
}
