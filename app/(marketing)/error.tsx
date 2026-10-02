"use client";

export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-alpine uppercase">Ice Age Expeditions</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">The expedition desk hit a problem</h1>
      <p className="mt-5 text-base leading-relaxed text-muted">
        This page could not be finished. Retry, or read the safety notes and send an enquiry once the route book is back.
      </p>
      <button type="button" onClick={reset} className="mt-8 min-h-11 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep">
        Try again
      </button>
    </section>
  );
}
