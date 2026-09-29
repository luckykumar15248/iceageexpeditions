import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold text-ink sm:text-6xl">That route is not on the board</h1>
      <p className="mt-5 text-xl text-muted">The expedition is unpublished, mistyped, or no longer running.</p>
      <Link href="/expeditions" className="mt-8 inline-flex min-h-14 items-center rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep">
        Back to expeditions
      </Link>
    </section>
  );
}
