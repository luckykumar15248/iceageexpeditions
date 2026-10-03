import type { ItineraryStop } from "@/lib/catalog"
import type { RoutePoint } from "@/lib/route-geo"
import { ElevationProfile } from "./elevation-profile"
import { RouteMap } from "./route-map"

const cardClass = "rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-8"

export function RouteVisualizer({
  title,
  points,
  days,
  start,
}: {
  title: string
  points: RoutePoint[]
  days: ItineraryStop[]
  start: { name: string; altitudeMeters: number | null } | null
}) {
  if (days.length === 0 && points.length < 2) {
    return (
      <p className="mt-6 text-base leading-relaxed text-muted">
        The route map and altitude profile are not published for this expedition yet.
      </p>
    )
  }

  const hasMap = points.length >= 2

  return (
    <div className={`mt-8 grid gap-6 ${hasMap ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start" : ""}`}>
      {hasMap ? (
        <div className="grid gap-4">
          <RouteMap points={points} title={title} />
          <p className="text-base leading-relaxed text-muted">
            The line joins each night’s camp in order. It is not the road alignment. Snow, washouts, and permit orders can move
            a camp or close a pass.
          </p>
          <details className="rounded-2xl border border-line bg-paper">
            <summary className="flex min-h-12 cursor-pointer items-center px-5 text-base font-medium text-ink">
              Camps on the map ({points.length})
            </summary>
            <ol className="grid gap-2 border-t border-line px-5 py-4 text-base text-ink">
              {points.map((point, index) => (
                <li key={`${point.dayNumber ?? "start"}-${index}`}>
                  <span className="font-semibold">{point.dayNumber == null ? "Start" : `Day ${point.dayNumber}`}</span>
                  {" — "}
                  {point.label}
                  {point.altitudeMeters != null ? `, ${point.altitudeMeters.toLocaleString("en-IN")} m` : ""}
                  {point.highPointName && point.highPointAltitudeMeters != null ? (
                    <span className="text-muted">
                      {" "}
                      (via {point.highPointName}, {point.highPointAltitudeMeters.toLocaleString("en-IN")} m)
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </details>
        </div>
      ) : (
        <div className={cardClass}>
          <h3 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Route map not published</h3>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Camp coordinates for this route have not been published. The day-by-day plan below lists every sleep stop and its
            altitude. Ask ops if you need the exact line before you book.
          </p>
        </div>
      )}
      <ElevationProfile days={days} start={start} />
    </div>
  )
}
