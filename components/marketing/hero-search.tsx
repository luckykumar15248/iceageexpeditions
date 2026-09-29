"use client"

import { useRouter } from "next/navigation"
import type { FormEvent } from "react"

const fieldClass = "min-h-14 w-full rounded-md border border-line bg-paper px-4 text-lg text-ink"

const corridors = [
  { value: "winter-spiti", label: "Winter Spiti" },
  { value: "zanskar-chadar", label: "Zanskar" },
  { value: "manali-leh", label: "Ladakh / Manali–Leh" },
] as const

export function HeroSearch({
  regions,
  seasons,
}: {
  regions: { slug: string; name: string }[]
  seasons: string[]
}) {
  const router = useRouter()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const vehicle = String(data.get("vehicle") ?? "")
    const region = String(data.get("region") ?? "")
    const season = String(data.get("season") ?? "")
    const corridor = corridors.some((item) => item.value === region) ? region : ""

    if (corridor) {
      const query = new URLSearchParams({ interest: corridor })
      if (vehicle) query.set("vehicle", vehicle)
      if (season) query.set("season", season)
      router.push(`/enquire?${query.toString()}`)
      return
    }

    const query = new URLSearchParams()
    if (vehicle) query.set("vehicle", vehicle)
    if (region) query.set("region", region)
    if (season) query.set("season", season)
    const search = query.toString()
    router.push(search ? `/expeditions?${search}` : "/expeditions")
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-line bg-canvas p-4 text-ink sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <label className="flex flex-col gap-2 text-base font-semibold">
        Vehicle
        <select name="vehicle" defaultValue="" className={fieldClass}>
          <option value="">4x4 SUV and motorbike</option>
          <option value="SUV_4X4">4x4 SUV</option>
          <option value="MOTORBIKE">Motorbike</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-semibold">
        Region
        <select name="region" defaultValue="" className={fieldClass}>
          <option value="">Ladakh, Spiti, Zanskar, or a published region</option>
          {corridors.map((corridor) => (
            <option key={corridor.value} value={corridor.value}>
              {corridor.label}
            </option>
          ))}
          {regions.map((region) => (
            <option key={region.slug} value={region.slug}>
              {region.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-semibold">
        Season
        <select name="season" defaultValue="" className={fieldClass}>
          <option value="">Any season</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
          {seasons.length === 0 ? (
            <>
              <option value="Summer">Summer</option>
              <option value="Winter">Winter</option>
            </>
          ) : null}
        </select>
      </label>
      <button
        type="submit"
        className="min-h-14 rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep"
      >
        Find an expedition
      </button>
    </form>
  )
}
