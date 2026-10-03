import type { ItineraryStop } from "@/lib/catalog"

export function ItineraryTimeline({ days }: { days: ItineraryStop[] }) {
  if (days.length === 0) {
    return <p className="text-base leading-relaxed text-muted">The day-by-day brief for this route is still being written.</p>
  }

  return (
    <ol className="mt-6 flex flex-col gap-4">
      {days.map((day, index) => (
        <li key={day.dayNumber}>
          <details {...(index === 0 ? { open: true } : {})} className="group rounded-3xl border border-line bg-paper shadow-[0_10px_28px_rgba(26,29,27,0.06)]">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-7 py-6">
              <span>
                <span className="block font-display text-2xl font-bold text-ink">
                  Day {day.dayNumber} — {day.title}
                </span>
                <span className="mt-2 block text-base text-alpine-deep">
                  Sleep at {day.sleepStop}, {day.sleepAltitudeMeters.toLocaleString("en-IN")} m · {day.movingHoursLabel}{" "}
                  rolling
                </span>
                {day.highPointName && day.highPointAltitudeMeters != null ? (
                  <span className="mt-1 block text-base text-muted">
                    High point: {day.highPointName}, {day.highPointAltitudeMeters.toLocaleString("en-IN")} m
                  </span>
                ) : null}
              </span>
              <span className="text-base font-semibold text-alpine group-open:hidden">Show</span>
              <span className="hidden text-base font-semibold text-alpine group-open:inline">Hide</span>
            </summary>
            <p className="px-7 pb-7 text-base leading-relaxed whitespace-pre-line text-muted">{day.body}</p>
          </details>
        </li>
      ))}
    </ol>
  )
}
