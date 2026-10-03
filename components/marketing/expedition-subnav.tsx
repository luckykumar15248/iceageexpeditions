const links = [
  { href: "#overview", label: "Overview" },
  { href: "#route", label: "Route" },
  { href: "#itinerary", label: "Itinerary" },
  { href: "#departures", label: "Departures" },
  { href: "#inclusions", label: "Inclusions" },
  { href: "#gear", label: "Gear" },
  { href: "#permits", label: "Permits" },
] as const

export function ExpeditionSubnav({ bookHref, bookLabel }: { bookHref: string; bookLabel: string }) {
  return (
    <div className="sticky top-20 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <nav aria-label="On this expedition" className="flex min-w-0 flex-1 gap-4 overflow-x-auto">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="shrink-0 py-3 text-base font-semibold text-ink hover:text-alpine">
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={bookHref}
          className="inline-flex min-h-12 shrink-0 items-center rounded-md bg-alpine px-5 text-base font-semibold text-white hover:bg-alpine-deep"
        >
          {bookLabel}
        </a>
      </div>
    </div>
  )
}
