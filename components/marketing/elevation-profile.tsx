import type { ItineraryStop } from "@/lib/catalog"

type Vertex = {
  slot: number
  altitude: number
  kind: "start" | "camp" | "pass"
  label: string
  axisLabel: string | null
}

type ProfileStats = {
  highestSleep: { altitude: number; dayNumber: number; stop: string } | null
  highestPass: { altitude: number; dayNumber: number; name: string } | null
  biggestGain: { meters: number; dayNumber: number; stop: string } | null
}

function buildProfile(days: ItineraryStop[], start: { name: string; altitudeMeters: number | null } | null) {
  const vertices: Vertex[] = []
  let slot = 0
  if (start && start.altitudeMeters != null && start.altitudeMeters > 0) {
    vertices.push({ slot, altitude: start.altitudeMeters, kind: "start", label: `Start: ${start.name}, ${metres(start.altitudeMeters)}`, axisLabel: "Start" })
    slot += 1
  }
  const stats: ProfileStats = { highestSleep: null, highestPass: null, biggestGain: null }
  let previousSleep: number | null = vertices[0]?.altitude ?? null
  let skipped = 0
  for (const day of days) {
    if (day.highPointName && day.highPointAltitudeMeters != null) {
      vertices.push({
        slot: slot - 0.5,
        altitude: day.highPointAltitudeMeters,
        kind: "pass",
        label: `Day ${day.dayNumber} high point: ${day.highPointName}, ${metres(day.highPointAltitudeMeters)}`,
        axisLabel: null,
      })
      if (!stats.highestPass || day.highPointAltitudeMeters > stats.highestPass.altitude) {
        stats.highestPass = { altitude: day.highPointAltitudeMeters, dayNumber: day.dayNumber, name: day.highPointName }
      }
    }
    if (day.sleepAltitudeMeters <= 0) {
      skipped += 1
      previousSleep = null
      slot += 1
      continue
    }
    vertices.push({
      slot,
      altitude: day.sleepAltitudeMeters,
      kind: "camp",
      label: `Day ${day.dayNumber}: ${day.sleepStop}, sleep ${metres(day.sleepAltitudeMeters)}`,
      axisLabel: String(day.dayNumber),
    })
    if (!stats.highestSleep || day.sleepAltitudeMeters > stats.highestSleep.altitude) {
      stats.highestSleep = { altitude: day.sleepAltitudeMeters, dayNumber: day.dayNumber, stop: day.sleepStop }
    }
    if (previousSleep != null) {
      const gain = day.sleepAltitudeMeters - previousSleep
      if (gain > 0 && (!stats.biggestGain || gain > stats.biggestGain.meters)) {
        stats.biggestGain = { meters: gain, dayNumber: day.dayNumber, stop: day.sleepStop }
      }
    }
    previousSleep = day.sleepAltitudeMeters
    slot += 1
  }
  return { vertices, stats, skipped }
}

export function ElevationProfile({
  days,
  start,
}: {
  days: ItineraryStop[]
  start: { name: string; altitudeMeters: number | null } | null
}) {
  const { vertices, stats, skipped } = buildProfile(days, start)
  const camps = vertices.filter((vertex) => vertex.kind !== "pass")

  if (camps.length < 2) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-8">
        <h3 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Altitude profile</h3>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Not available yet. Too few days have a listed sleep altitude to draw a profile. Ask ops for the current altitude plan.
        </p>
      </div>
    )
  }

  const altitudes = vertices.map((vertex) => vertex.altitude)
  const step = tickStep(Math.max(...altitudes) - Math.min(...altitudes))
  const yMin = Math.max(0, Math.floor((Math.min(...altitudes) - step / 2) / step) * step)
  const yMax = Math.ceil((Math.max(...altitudes) + step / 4) / step) * step
  const ticks: number[] = []
  for (let value = yMin; value <= yMax; value += step) ticks.push(value)
  const minSlot = Math.min(...vertices.map((vertex) => vertex.slot))
  const maxSlot = Math.max(...vertices.map((vertex) => vertex.slot))
  const x = (slot: number) => (maxSlot === minSlot ? 50 : ((slot - minSlot) / (maxSlot - minSlot)) * 100)
  const y = (altitude: number) => 100 - ((altitude - yMin) / (yMax - yMin)) * 100
  const ordered = [...vertices].sort((a, b) => a.slot - b.slot)
  const line = ordered.map((vertex) => `${x(vertex.slot).toFixed(2)},${y(vertex.altitude).toFixed(2)}`).join(" ")
  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  const area = first && last ? `${x(first.slot).toFixed(2)},100 ${line} ${x(last.slot).toFixed(2)},100` : ""
  const labelEvery = Math.max(1, Math.ceil(camps.length / 10))
  const summary = profileSummary(stats, camps.length)

  return (
    <figure className="rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-8">
      <figcaption>
        <h3 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Altitude profile</h3>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Sleep altitude each night{stats.highestPass ? ", with the day’s high point between camps" : ""}. Altitudes are the
          planned stops, not a guarantee.
        </p>
      </figcaption>

      <div className="relative mt-6 h-60 pr-2 pb-8 pl-16" role="img" aria-label={summary}>
        <div className="relative h-full" aria-hidden="true">
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-line" style={{ top: `${y(tick)}%` }}>
              <span className="absolute -top-3 -left-16 w-14 text-right text-sm text-muted">{tick.toLocaleString("en-IN")} m</span>
            </div>
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <polygon points={area} className="fill-alpine-soft" />
            <polyline
              points={line}
              fill="none"
              className="stroke-alpine"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {ordered.map((vertex, index) => (
            <span
              key={`${vertex.kind}-${vertex.slot}-${index}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x(vertex.slot)}%`, top: `${y(vertex.altitude)}%` }}
            >
              {vertex.kind === "pass" ? (
                <span className="block size-0 border-x-[7px] border-b-[11px] border-x-transparent border-b-alpine-deep" />
              ) : (
                <span className={`block size-3 rounded-full border-2 border-paper ${vertex.kind === "start" ? "bg-ink" : "bg-alpine"}`} />
              )}
              <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-56 -translate-x-1/2 rounded-lg border border-line bg-paper px-3 py-2 text-sm leading-snug text-ink shadow-[0_10px_24px_rgba(26,29,27,0.12)] group-hover:visible">
                {vertex.label}
              </span>
            </span>
          ))}
          {camps.map((vertex, index) =>
            vertex.axisLabel && (index % labelEvery === 0 || index === camps.length - 1) ? (
              <span
                key={`axis-${vertex.slot}`}
                className="absolute top-full mt-2 -translate-x-1/2 text-sm text-muted"
                style={{ left: `${x(vertex.slot)}%` }}
              >
                {vertex.kind === "start" ? vertex.axisLabel : `D${vertex.axisLabel}`}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        {stats.highestSleep ? (
          <Stat label="Highest sleep" value={metres(stats.highestSleep.altitude)} note={`Day ${stats.highestSleep.dayNumber}, ${stats.highestSleep.stop}`} />
        ) : null}
        {stats.highestPass ? (
          <Stat label="Highest crossing" value={metres(stats.highestPass.altitude)} note={`Day ${stats.highestPass.dayNumber}, ${stats.highestPass.name}`} />
        ) : null}
        {stats.biggestGain ? (
          <Stat label="Biggest one-night gain" value={`+${metres(stats.biggestGain.meters)}`} note={`Into Day ${stats.biggestGain.dayNumber}, ${stats.biggestGain.stop}`} />
        ) : null}
      </dl>
      {skipped > 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {skipped} {skipped === 1 ? "day has" : "days have"} no listed sleep altitude and {skipped === 1 ? "is" : "are"} left off the profile.
        </p>
      ) : null}
    </figure>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold tracking-wide text-alpine uppercase">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tracking-tight text-ink">{value}</dd>
      <dd className="text-sm text-muted">{note}</dd>
    </div>
  )
}

function tickStep(range: number): number {
  if (range <= 1200) return 250
  if (range <= 2500) return 500
  return 1000
}

function metres(value: number): string {
  return `${value.toLocaleString("en-IN")} m`
}

function profileSummary(stats: ProfileStats, nights: number): string {
  const parts = [`Altitude profile across ${nights} points.`]
  if (stats.highestSleep) parts.push(`Highest sleep ${metres(stats.highestSleep.altitude)} on day ${stats.highestSleep.dayNumber} at ${stats.highestSleep.stop}.`)
  if (stats.highestPass) parts.push(`Highest crossing ${stats.highestPass.name}, ${metres(stats.highestPass.altitude)}, on day ${stats.highestPass.dayNumber}.`)
  if (stats.biggestGain) parts.push(`Biggest one-night gain ${metres(stats.biggestGain.meters)} into day ${stats.biggestGain.dayNumber}.`)
  parts.push("Each day's altitudes are listed in the itinerary.")
  return parts.join(" ")
}
