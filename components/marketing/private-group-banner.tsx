import Link from "next/link"

export function PrivateGroupBanner() {
  return (
    <section className="bg-canvas" aria-labelledby="private-heading">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-8 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl border-l-4 border-alpine pl-6">
            <p className="text-sm font-semibold tracking-wide text-alpine uppercase">Private groups and full batches</p>
            <h2 id="private-heading" className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
              Ask for a date that is not on the board yet
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              A custom convoy or a waitlist for a full departure is quoted only after vehicles, guides, and the permit
              window are real.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/enquire?interest=private"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep"
            >
              Request a private group
            </Link>
            <Link
              href="/expeditions"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-6 text-base font-medium text-ink hover:border-alpine hover:text-alpine"
            >
              See open departures
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
