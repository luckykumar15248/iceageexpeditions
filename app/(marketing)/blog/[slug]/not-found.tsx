import Link from "next/link"

export default function BlogPostNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <div className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-alpine uppercase">Journal</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">This article is not on the trail</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          It may have been renamed, unpublished, or not published yet. The journal index lists everything that is live.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/blog" className="inline-flex min-h-12 items-center rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep">
            Browse the journal
          </Link>
          <Link href="/expeditions" className="inline-flex min-h-12 items-center rounded-md border border-line bg-paper px-5 text-base font-medium text-ink hover:border-alpine">
            See expeditions
          </Link>
        </div>
      </div>
    </div>
  )
}
