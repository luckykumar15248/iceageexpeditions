import Form from "next/form"
import { Difficulty, VehicleClass } from "@/app/generated/prisma/client"
import { difficultyLabel } from "@/lib/format"
import type { CatalogFilters } from "@/lib/catalog"

const fieldClass = "min-h-14 rounded-md border border-line bg-paper px-4 text-lg text-ink"
const difficulties = [Difficulty.MODERATE, Difficulty.CHALLENGING, Difficulty.STRENUOUS, Difficulty.EXTREME] as const

export function CatalogFilters({
  filters,
  regions,
  seasons,
}: {
  filters: CatalogFilters
  regions: { slug: string; name: string }[]
  seasons: string[]
}) {
  return (
    <Form action="/expeditions" className="grid gap-5 rounded-3xl border border-line bg-paper p-7 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Vehicle class
        <select name="vehicle" defaultValue={filters.vehicle ?? ""} className={fieldClass}>
          <option value="">4x4 SUV and motorbike</option>
          <option value={VehicleClass.SUV_4X4}>4x4 SUV</option>
          <option value={VehicleClass.MOTORBIKE}>Motorbike</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Difficulty
        <select name="difficulty" defaultValue={filters.difficulty ?? ""} className={fieldClass}>
          <option value="">Any difficulty</option>
          {difficulties.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficultyLabel(difficulty)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Region
        <select name="region" defaultValue={filters.region ?? ""} className={fieldClass}>
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region.slug} value={region.slug}>
              {region.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Season
        <select name="season" defaultValue={filters.season ?? ""} className={fieldClass}>
          <option value="">All seasons</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="min-h-14 rounded-md bg-alpine px-4 text-lg font-semibold text-white hover:bg-alpine-deep"
      >
        Apply filters
      </button>
    </Form>
  )
}
