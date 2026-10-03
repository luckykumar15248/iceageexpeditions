export default function BlogLoading() {
  return (
    <div className="pb-20" role="status" aria-live="polite">
      <span className="sr-only">Loading the journal…</span>
      <div className="border-b border-line bg-paper">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="h-4 w-28 animate-pulse rounded bg-line motion-reduce:animate-none" />
          <div className="mt-4 h-12 w-full max-w-xl animate-pulse rounded bg-line motion-reduce:animate-none" />
          <div className="mt-5 h-5 w-full max-w-2xl animate-pulse rounded bg-line motion-reduce:animate-none" />
          <div className="mt-8 h-12 w-full max-w-2xl animate-pulse rounded-md bg-line motion-reduce:animate-none" />
        </div>
      </div>
      <ul className="mx-auto mt-12 grid w-full max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-3xl border border-line bg-paper">
            <div className="aspect-[16/10] animate-pulse bg-line motion-reduce:animate-none" />
            <div className="grid gap-3 p-6">
              <div className="h-3 w-20 animate-pulse rounded bg-line motion-reduce:animate-none" />
              <div className="h-6 w-4/5 animate-pulse rounded bg-line motion-reduce:animate-none" />
              <div className="h-4 w-full animate-pulse rounded bg-line motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-line motion-reduce:animate-none" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
