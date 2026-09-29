import { cache } from "react"
import { unstable_cache } from "next/cache"
import { connection } from "next/server"
import {
  DepartureStatus,
  ExpeditionStatus,
  VehicleClass,
  type Difficulty,
  type Prisma,
} from "@/app/generated/prisma/client"
import { isFutureDepartureDate } from "@/lib/dates"
import { getPrisma } from "@/lib/db"
import {
  departureStatusLabel,
  difficultyLabel,
  formatDepartureDate,
  formatInr,
  formatMovingHours,
  inventoryNoun,
  textLines,
  vehicleLabel,
} from "@/lib/format"

const PUBLIC_DEPARTURE_STATUSES = [
  DepartureStatus.OPEN,
  DepartureStatus.FULL,
  DepartureStatus.CLOSED,
  DepartureStatus.CANCELLED,
  DepartureStatus.COMPLETED,
] as const

export type CatalogFilters = {
  vehicle?: VehicleClass
  region?: string
  season?: string
  difficulty?: Difficulty
}

export type Availability = "open" | "limited" | "soldout" | "waitlist" | "enquire"

export type ExpeditionCard = {
  id: string
  slug: string
  title: string
  summary: string
  regionName: string
  regionSlug: string
  vehicleClass: VehicleClass
  vehicleLabel: string
  durationDays: number
  maxAltitudeMeters: number
  difficulty: Difficulty
  difficultyLabel: string
  seasonLabel: string
  heroImageUrl: string
  heroAlt: string
  fromPricePaisa: number | null
  fromPriceLabel: string | null
  availability: Availability
  availabilityLabel: string
}

export type DepartureRow = {
  id: string
  startLabel: string
  endLabel: string
  meetingPoint: string
  seatsRemaining: number
  capacity: number
  inventoryLabel: string
  priceLabel: string
  depositLabel: string
  status: DepartureStatus
  statusLabel: string
  bookable: boolean
}

export type ItineraryStop = {
  dayNumber: number
  title: string
  body: string
  sleepStop: string
  sleepAltitudeMeters: number
  movingHoursLabel: string
}

export type ExpeditionDetail = ExpeditionCard & {
  inclusions: string[]
  inclusionText: string
  exclusions: string[]
  exclusionText: string
  permitNotes: string | null
  supportVehicleIncluded: boolean
  movingHoursLabel: string
  days: ItineraryStop[]
  departures: DepartureRow[]
  updatedAtIso: string
  heroImageAlt: string | null
  metaTitle: string | null
  metaDescription: string | null
  focusKeywords: string | null
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string | null
  ogDescription: string | null
  ogImageUrl: string | null
  ogImageAlt: string | null
  gallery: { url: string; alt: string }[]
}

export type CatalogPayload = {
  status: "ok" | "offline"
  expeditions: ExpeditionCard[]
  regions: { slug: string; name: string }[]
  seasons: string[]
}

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  vehicleClass: true,
  durationDays: true,
  maxAltitudeMeters: true,
  difficulty: true,
  seasonLabel: true,
  heroImageUrl: true,
  updatedAt: true,
  region: { select: { slug: true, name: true } },
  departures: {
    where: { status: { in: [...PUBLIC_DEPARTURE_STATUSES] } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      meetingPoint: true,
      capacity: true,
      seatsRemaining: true,
      pricePaisa: true,
      depositPaisa: true,
      status: true,
    },
  },
} satisfies Prisma.ExpeditionSelect

const listSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  vehicleClass: true,
  durationDays: true,
  maxAltitudeMeters: true,
  difficulty: true,
  seasonLabel: true,
  heroImageUrl: true,
  region: { select: { slug: true, name: true } },
  departures: {
    where: { status: { in: [...PUBLIC_DEPARTURE_STATUSES] } },
    orderBy: { startDate: "asc" as const },
    select: {
      startDate: true,
      capacity: true,
      seatsRemaining: true,
      pricePaisa: true,
      status: true,
    },
  },
} satisfies Prisma.ExpeditionSelect

type PricedDeparture = {
  startDate: Date
  status: DepartureStatus
  seatsRemaining: number
  capacity: number
  pricePaisa: number
}

type CardSource = {
  id: string
  slug: string
  title: string
  summary: string
  region: { name: string; slug: string }
  vehicleClass: VehicleClass
  durationDays: number
  maxAltitudeMeters: number
  difficulty: Difficulty
  seasonLabel: string
  heroImageUrl: string | null
  departures: PricedDeparture[]
}

function defaultHero(vehicle: VehicleClass): string {
  return vehicle === "MOTORBIKE" ? "/imagery/motorbike-high-road.svg" : "/imagery/suv-high-road.svg"
}

function heroAlt(title: string, regionName: string, vehicle: VehicleClass): string {
  const craft = vehicle === "MOTORBIKE" ? "a motorbike" : "a 4x4 SUV"
  return `${title} in ${regionName}: ${craft} on a high Himalayan road with support in the convoy`
}

function isScarce(seatsRemaining: number, capacity: number): boolean {
  if (seatsRemaining <= 0 || capacity <= 0) return false
  return seatsRemaining <= 2 || seatsRemaining / capacity <= 0.25
}

function availabilityFor(departures: PricedDeparture[]): Availability {
  const nextOpen = departures.find(
    (departure) =>
      departure.status === DepartureStatus.OPEN &&
      departure.seatsRemaining > 0 &&
      isFutureDepartureDate(departure.startDate),
  )
  if (nextOpen) return isScarce(nextOpen.seatsRemaining, nextOpen.capacity) ? "limited" : "open"
  if (departures.some((departure) => departure.status === DepartureStatus.FULL)) return "soldout"
  if (departures.some((departure) => departure.status === DepartureStatus.CLOSED)) return "waitlist"
  return "enquire"
}

function availabilityLabel(availability: Availability): string {
  if (availability === "open") return "Open"
  if (availability === "limited") return "Limited slots"
  if (availability === "soldout") return "Sold out"
  if (availability === "waitlist") return "Waitlist"
  return "Enquire"
}

function publicImage(url: string | null, vehicleClass: VehicleClass): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url
  if (url && url.startsWith("https://")) return url
  return defaultHero(vehicleClass)
}

function fromPrice(departures: PricedDeparture[]): number | null {
  const openPrices = departures
    .filter((departure) => departure.status === DepartureStatus.OPEN && isFutureDepartureDate(departure.startDate))
    .map((departure) => departure.pricePaisa)
  const pool = openPrices.length > 0 ? openPrices : departures.map((departure) => departure.pricePaisa)
  if (pool.length === 0) return null
  return Math.min(...pool)
}

function toCard(row: CardSource): ExpeditionCard {
  const price = fromPrice(row.departures)
  const availability = availabilityFor(row.departures)
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    regionName: row.region.name,
    regionSlug: row.region.slug,
    vehicleClass: row.vehicleClass,
    vehicleLabel: vehicleLabel(row.vehicleClass),
    durationDays: row.durationDays,
    maxAltitudeMeters: row.maxAltitudeMeters,
    difficulty: row.difficulty,
    difficultyLabel: difficultyLabel(row.difficulty),
    seasonLabel: row.seasonLabel,
    heroImageUrl: publicImage(row.heroImageUrl, row.vehicleClass),
    heroAlt: heroAlt(row.title, row.region.name, row.vehicleClass),
    fromPricePaisa: price,
    fromPriceLabel: price == null ? null : formatInr(price),
    availability,
    availabilityLabel: availabilityLabel(availability),
  }
}

function parseVehicle(value: string | undefined): VehicleClass | undefined {
  if (value === VehicleClass.SUV_4X4 || value === VehicleClass.MOTORBIKE) return value
  return undefined
}

const DIFFICULTIES = ["MODERATE", "CHALLENGING", "STRENUOUS", "EXTREME"] as const

function parseDifficulty(value: string | undefined): Difficulty | undefined {
  if (value && DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number])) return value as Difficulty
  return undefined
}

export function parseCatalogFilters(input: {
  vehicle?: string
  region?: string
  season?: string
  difficulty?: string
}): CatalogFilters {
  return {
    vehicle: parseVehicle(input.vehicle),
    region: input.region?.trim() || undefined,
    season: input.season?.trim() || undefined,
    difficulty: parseDifficulty(input.difficulty),
  }
}

async function readPublic<T>(work: () => Promise<T>): Promise<T | "offline"> {
  try {
    return await work()
  } catch {
    return "offline"
  }
}

async function readLive<T>(work: () => Promise<T>): Promise<T | "offline"> {
  try {
    await connection()
    return await work()
  } catch {
    return "offline"
  }
}

const CATALOG_CACHE = { revalidate: 60, tags: ["catalog"] }

function catalogKey(filters: CatalogFilters): string {
  return JSON.stringify({
    vehicle: filters.vehicle ?? "",
    region: filters.region ?? "",
    season: filters.season ?? "",
    difficulty: filters.difficulty ?? "",
  })
}

const loadCatalog = unstable_cache(async (key: string): Promise<CatalogPayload> => {
  const parsed = JSON.parse(key) as { vehicle: string; region: string; season: string; difficulty: string }
  const filters: CatalogFilters = {
    vehicle: parseVehicle(parsed.vehicle),
    region: parsed.region || undefined,
    season: parsed.season || undefined,
    difficulty: parseDifficulty(parsed.difficulty),
  }
  const result = await readPublic(async () => {
    const prisma = getPrisma()
    const [rows, regions, seasonRows] = await Promise.all([
      prisma.expedition.findMany({
        where: {
          status: ExpeditionStatus.PUBLISHED,
          vehicleClass: filters.vehicle,
          difficulty: filters.difficulty,
          seasonLabel: filters.season,
          region: filters.region ? { slug: filters.region } : undefined,
        },
        select: listSelect,
        orderBy: [{ title: "asc" }],
      }),
      prisma.region.findMany({
        where: { expeditions: { some: { status: ExpeditionStatus.PUBLISHED } } },
        select: { slug: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.expedition.findMany({
        where: { status: ExpeditionStatus.PUBLISHED },
        select: { seasonLabel: true },
        distinct: ["seasonLabel"],
        orderBy: { seasonLabel: "asc" },
      }),
    ])
    return {
      expeditions: rows.map(toCard),
      regions,
      seasons: seasonRows.map((row) => row.seasonLabel),
    }
  })

  if (result === "offline") {
    return { status: "offline", expeditions: [], regions: [], seasons: [] }
  }
  return { status: "ok", ...result }
}, ["catalog"], CATALOG_CACHE)

export const getCatalog = cache(async (filters: CatalogFilters): Promise<CatalogPayload> => {
  return loadCatalog(catalogKey(filters))
})

const loadExpeditionDetail = unstable_cache(
  async (slug: string): Promise<ExpeditionDetail | "offline" | null> => {
    const result = await readPublic(async () => {
      return getPrisma().expedition.findFirst({
        where: { slug, status: ExpeditionStatus.PUBLISHED },
        select: {
          ...cardSelect,
          inclusions: true,
          exclusions: true,
          permitNotes: true,
          supportVehicleIncluded: true,
          heroImageAlt: true,
          metaTitle: true,
          metaDescription: true,
          focusKeywords: true,
          robotsIndex: true,
          robotsFollow: true,
          ogTitle: true,
          ogDescription: true,
          ogImageUrl: true,
          ogImageAlt: true,
          gallery: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
          days: {
            orderBy: { dayNumber: "asc" },
            select: {
              dayNumber: true,
              title: true,
              body: true,
              sleepStop: true,
              sleepAltitudeMeters: true,
              movingHours: true,
            },
          },
        },
      })
    })

    if (result === "offline") return "offline"
    if (!result) return null

    const card = toCard(result)
    const movingHours = result.days.reduce((sum, day) => sum + Number(day.movingHours), 0)
    const departures: DepartureRow[] = result.departures.map((departure) => {
      const bookable =
        departure.status === DepartureStatus.OPEN &&
        departure.seatsRemaining > 0 &&
        isFutureDepartureDate(departure.startDate)
      return {
        id: departure.id,
        startLabel: formatDepartureDate(departure.startDate),
        endLabel: formatDepartureDate(departure.endDate),
        meetingPoint: departure.meetingPoint,
        seatsRemaining: departure.seatsRemaining,
        capacity: departure.capacity,
        inventoryLabel: `${departure.seatsRemaining} of ${departure.capacity} ${inventoryNoun(result.vehicleClass, departure.capacity)}`,
        priceLabel: formatInr(departure.pricePaisa),
        depositLabel: formatInr(departure.depositPaisa),
        status: departure.status,
        statusLabel: departureStatusLabel(departure.status),
        bookable,
      }
    })

    return {
      ...card,
      heroAlt: result.heroImageAlt?.trim() || card.heroAlt,
      inclusions: textLines(result.inclusions),
      inclusionText: result.inclusions,
      exclusions: textLines(result.exclusions),
      exclusionText: result.exclusions,
      permitNotes: result.permitNotes,
      supportVehicleIncluded: result.supportVehicleIncluded,
      movingHoursLabel: formatMovingHours(movingHours),
      days: result.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        body: day.body,
        sleepStop: day.sleepStop,
        sleepAltitudeMeters: day.sleepAltitudeMeters,
        movingHoursLabel: formatMovingHours(Number(day.movingHours)),
      })),
      departures,
      updatedAtIso: result.updatedAt.toISOString(),
      heroImageAlt: result.heroImageAlt,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      focusKeywords: result.focusKeywords,
      robotsIndex: result.robotsIndex,
      robotsFollow: result.robotsFollow,
      ogTitle: result.ogTitle,
      ogDescription: result.ogDescription,
      ogImageUrl: result.ogImageUrl,
      ogImageAlt: result.ogImageAlt,
      gallery: result.gallery,
    }
  },
  ["expedition-detail"],
  CATALOG_CACHE,
)

export const getExpeditionDetail = cache(async (slug: string): Promise<ExpeditionDetail | "offline" | null> => {
  return loadExpeditionDetail(slug)
})

export type UpcomingDepartureCard = {
  id: string
  slug: string
  title: string
  vehicleLabel: string
  startLabel: string
  endLabel: string
  priceLabel: string
  inventoryLabel: string
  placesNote: string
  scarce: boolean
  heroImageUrl: string
  heroAlt: string
}

const loadUpcomingDepartures = unstable_cache(
  async (): Promise<UpcomingDepartureCard[] | "offline"> => {
    const result = await readPublic(async () => {
      return getPrisma().departure.findMany({
        where: {
          status: DepartureStatus.OPEN,
          seatsRemaining: { gt: 0 },
          expedition: { status: ExpeditionStatus.PUBLISHED },
        },
        orderBy: { startDate: "asc" },
        take: 24,
        select: {
          id: true,
          startDate: true,
          endDate: true,
          capacity: true,
          seatsRemaining: true,
          pricePaisa: true,
          expedition: {
            select: {
              slug: true,
              title: true,
              vehicleClass: true,
              heroImageUrl: true,
              region: { select: { name: true } },
            },
          },
        },
      })
    })
    if (result === "offline") return "offline"
    return result
      .filter((departure) => isFutureDepartureDate(departure.startDate))
      .slice(0, 6)
      .map((departure) => ({
        id: departure.id,
        slug: departure.expedition.slug,
        title: departure.expedition.title,
        vehicleLabel: vehicleLabel(departure.expedition.vehicleClass),
        startLabel: formatDepartureDate(departure.startDate),
        endLabel: formatDepartureDate(departure.endDate),
        priceLabel: formatInr(departure.pricePaisa),
        inventoryLabel: `${departure.seatsRemaining} of ${departure.capacity} ${inventoryNoun(departure.expedition.vehicleClass, departure.capacity)}`,
        placesNote: isScarce(departure.seatsRemaining, departure.capacity)
          ? `Only ${departure.seatsRemaining} ${inventoryNoun(departure.expedition.vehicleClass, departure.seatsRemaining)} left`
          : `${departure.seatsRemaining} ${inventoryNoun(departure.expedition.vehicleClass, departure.seatsRemaining)} open`,
        scarce: isScarce(departure.seatsRemaining, departure.capacity),
        heroImageUrl: publicImage(departure.expedition.heroImageUrl, departure.expedition.vehicleClass),
        heroAlt: heroAlt(departure.expedition.title, departure.expedition.region.name, departure.expedition.vehicleClass),
      }))
  },
  ["upcoming-departures"],
  CATALOG_CACHE,
)

export const listUpcomingDepartures = cache(async (): Promise<UpcomingDepartureCard[] | "offline"> => {
  return loadUpcomingDepartures()
})

const loadSitemapExpeditions = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const result = await readPublic(async () => {
      return getPrisma().expedition.findMany({
        where: { status: ExpeditionStatus.PUBLISHED },
        select: { slug: true, updatedAt: true },
        orderBy: { slug: "asc" },
      })
    })
    if (result === "offline") return []
    return result.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() }))
  },
  ["sitemap-expeditions"],
  CATALOG_CACHE,
)

export const listSitemapExpeditions = cache(async () => loadSitemapExpeditions())

export type BookableDeparture = {
  id: string
  expeditionSlug: string
  expeditionTitle: string
  vehicleClass: VehicleClass
  vehicleLabel: string
  startLabel: string
  endLabel: string
  meetingPoint: string
  inventoryLabel: string
  priceLabel: string
  depositLabel: string
  policySnapshot: string
  seatsRemaining: number
}

export const getBookableDeparture = cache(async (id: string): Promise<BookableDeparture | "offline" | "closed" | null> => {
  const result = await readLive(async () => {
    return getPrisma().departure.findFirst({
      where: {
        id,
        expedition: { status: ExpeditionStatus.PUBLISHED },
        status: { in: [...PUBLIC_DEPARTURE_STATUSES] },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        meetingPoint: true,
        capacity: true,
        seatsRemaining: true,
        pricePaisa: true,
        depositPaisa: true,
        status: true,
        policySnapshot: true,
        expedition: { select: { slug: true, title: true, vehicleClass: true } },
      },
    })
  })
  if (result === "offline") return "offline"
  if (!result) return null
  const bookable =
    result.status === DepartureStatus.OPEN && result.seatsRemaining > 0 && isFutureDepartureDate(result.startDate)
  if (!bookable) return "closed"
  return {
    id: result.id,
    expeditionSlug: result.expedition.slug,
    expeditionTitle: result.expedition.title,
    vehicleClass: result.expedition.vehicleClass,
    vehicleLabel: vehicleLabel(result.expedition.vehicleClass),
    startLabel: formatDepartureDate(result.startDate),
    endLabel: formatDepartureDate(result.endDate),
    meetingPoint: result.meetingPoint,
    inventoryLabel: `${result.seatsRemaining} ${inventoryNoun(result.expedition.vehicleClass, result.seatsRemaining)} left`,
    priceLabel: formatInr(result.pricePaisa),
    depositLabel: formatInr(result.depositPaisa),
    policySnapshot: result.policySnapshot,
    seatsRemaining: result.seatsRemaining,
  }
})
