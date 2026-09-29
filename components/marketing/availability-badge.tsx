import type { Availability } from "@/lib/catalog"

const styles: Record<Availability, string> = {
  open: "bg-alpine text-white",
  limited: "bg-alpine-soft text-alpine-deep",
  soldout: "bg-ink text-white",
  waitlist: "bg-canvas text-ink ring-1 ring-line",
  enquire: "bg-paper text-muted ring-1 ring-line",
}

export function AvailabilityBadge({
  availability,
  label,
}: {
  availability: Availability
  label: string
}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${styles[availability]}`}>
      {label}
    </span>
  )
}
