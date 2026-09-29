import { revalidateTag } from "next/cache"
import {
  AuditAction,
  DepartureStatus,
  Difficulty,
  EnquiryStatus,
  ExpeditionStatus,
  VehicleClass,
  type Prisma,
} from "@/app/generated/prisma/client"
import { writeAudit } from "@/lib/audit"
import { isFutureDepartureDate } from "@/lib/dates"
import { getPrisma } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, requireStaff } from "@/lib/staff"

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export type CmsDay = {
  dayNumber: number
  title: string
  body: string
  sleepStop: string
  sleepAltitudeMeters: number
  movingHours: number
}

export type CmsImage = { url: string; alt: string }

export type CmsExpeditionInput = {
  id?: string
  title: string
  slug: string
  regionName: string
  vehicleClass: string
  durationDays: number
  maxAltitudeMeters: number
  difficulty: string
  seasonLabel: string
  summary: string
  inclusions: string
  exclusions: string
  permitNotes: string
  supportVehicleIncluded: boolean
  heroImageUrl: string
  heroImageAlt: string
  status: string
  metaTitle: string
  metaDescription: string
  focusKeywords: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  ogImageAlt: string
  days: CmsDay[]
  gallery: CmsImage[]
}

function optionalText(value: string, max: number, label: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > max) throw new DomainError(DomainErrorCode.CONTENT_INVALID, `${label} is too long`)
  return trimmed
}

function mediaUrl(value: string, label: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed.slice(0, 500)
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, `${label} must be a site path or an https URL`)
  }
  if (url.protocol !== "https:") {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, `${label} must use https`)
  }
  return trimmed.slice(0, 500)
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140)
}

function parseVehicle(value: string): VehicleClass {
  if (value === VehicleClass.SUV_4X4 || value === VehicleClass.MOTORBIKE) return value
  throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Choose a 4x4 SUV or motorbike vehicle class")
}

function parseDifficulty(value: string): Difficulty {
  if (value === "MODERATE" || value === "CHALLENGING" || value === "STRENUOUS" || value === "EXTREME") return value
  throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Choose a difficulty")
}

function parseStatus(value: string): ExpeditionStatus {
  if (value === ExpeditionStatus.DRAFT || value === ExpeditionStatus.PUBLISHED) return value
  throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Status must be draft or published")
}

function rupeesToPaisa(value: string, label: string): number {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new DomainError(DomainErrorCode.PRICE_INVALID, `${label} must be a rupee amount`)
  }
  const paisa = Math.round(Number(trimmed) * 100)
  if (!Number.isSafeInteger(paisa) || paisa < 0) {
    throw new DomainError(DomainErrorCode.PRICE_INVALID, `${label} is not a valid amount`)
  }
  return paisa
}

export async function saveExpedition(input: CmsExpeditionInput): Promise<{ id: string; slug: string }> {
  const actor = await requireOpsStaff()
  await requireStaff(actor.id, StaffPermission.catalogWrite)

  const title = input.title.trim()
  const slug = slugify(input.slug || input.title)
  const regionName = input.regionName.trim()
  const seasonLabel = input.seasonLabel.trim()
  const summary = input.summary.trim()
  const vehicleClass = parseVehicle(input.vehicleClass)
  const difficulty = parseDifficulty(input.difficulty)
  const status = parseStatus(input.status)
  if (title.length < 3 || title.length > 180) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Title must be between 3 and 180 characters")
  }
  if (!SLUG.test(slug)) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Slug must be lowercase words separated by hyphens")
  if (regionName.length < 2) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "A region name is required")
  if (!Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 40) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Duration must be between 1 and 40 days")
  }
  if (!Number.isInteger(input.maxAltitudeMeters) || input.maxAltitudeMeters < 500 || input.maxAltitudeMeters > 8000) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Max altitude must be between 500 and 8000 metres")
  }
  if (seasonLabel.length < 2) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "A season label is required")
  if (summary.length < 20) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Summary needs at least a short paragraph")
  if (status === ExpeditionStatus.PUBLISHED && input.days.length === 0) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "A published route needs at least one itinerary day")
  }

  const heroImageUrl = input.heroImageUrl.trim() ? mediaUrl(input.heroImageUrl, "Hero image") : null
  const heroImageAlt = optionalText(input.heroImageAlt, 240, "Hero alt text")
  if (heroImageUrl && !heroImageAlt) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "A hero image needs alt text")
  }
  const ogImageUrl = input.ogImageUrl.trim() ? mediaUrl(input.ogImageUrl, "Social image") : null
  const ogImageAlt = optionalText(input.ogImageAlt, 240, "Social image alt text")
  if (ogImageUrl && !ogImageAlt) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "A social image needs alt text")
  }

  const days = input.days.map((day, index) => {
    if (!Number.isInteger(day.dayNumber) || day.dayNumber < 1 || day.dayNumber > 40) {
      throw new DomainError(DomainErrorCode.CONTENT_INVALID, `Day ${index + 1} needs a day number`)
    }
    if (day.title.trim().length < 2) throw new DomainError(DomainErrorCode.CONTENT_INVALID, `Day ${day.dayNumber} needs a title`)
    if (day.body.trim().length < 10) throw new DomainError(DomainErrorCode.CONTENT_INVALID, `Day ${day.dayNumber} needs a description`)
    if (day.sleepStop.trim().length < 2) {
      throw new DomainError(DomainErrorCode.CONTENT_INVALID, `Day ${day.dayNumber} needs a sleep stop, or “Not set” if ops has not named it`)
    }
    if (!Number.isInteger(day.sleepAltitudeMeters) || day.sleepAltitudeMeters < 0 || day.sleepAltitudeMeters > 8000) {
      throw new DomainError(DomainErrorCode.CONTENT_INVALID, `Day ${day.dayNumber} sleep altitude must be in metres`)
    }
    if (!Number.isFinite(day.movingHours) || day.movingHours < 0 || day.movingHours > 18) {
      throw new DomainError(DomainErrorCode.CONTENT_INVALID, `Day ${day.dayNumber} moving hours must be between 0 and 18`)
    }
    return day
  })
  const dayNumbers = new Set(days.map((day) => day.dayNumber))
  if (dayNumbers.size !== days.length) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Each itinerary day number must be unique")
  }

  const gallery = input.gallery.slice(0, 12).map((image, index) => ({
    url: mediaUrl(image.url, `Gallery image ${index + 1}`),
    alt: image.alt.trim(),
    sortOrder: index,
  }))
  for (const image of gallery) {
    if (image.alt.length < 3) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Each gallery image needs alt text")
  }

  const prisma = getPrisma()
  const saved = await prisma.$transaction(async (tx) => {
    const regionSlug = slugify(regionName)
    if (!SLUG.test(regionSlug)) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Region name needs letters or numbers")
    const region = await tx.region.upsert({
      where: { slug: regionSlug },
      update: { name: regionName },
      create: {
        slug: regionSlug,
        name: regionName,
        summary: "Region record created from the ops desk. Route facts live on the expedition.",
      },
      select: { id: true },
    })

    const duplicate = await tx.expedition.findFirst({
      where: { slug, NOT: input.id ? { id: input.id } : undefined },
      select: { id: true },
    })
    if (duplicate) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "That slug is already used")

    const data = {
      regionId: region.id,
      slug,
      title,
      vehicleClass,
      durationDays: input.durationDays,
      maxAltitudeMeters: input.maxAltitudeMeters,
      difficulty,
      seasonLabel,
      summary,
      inclusions: input.inclusions.trim(),
      exclusions: input.exclusions.trim(),
      permitNotes: optionalText(input.permitNotes, 5000, "Permit notes"),
      supportVehicleIncluded: input.supportVehicleIncluded,
      heroImageUrl,
      heroImageAlt,
      metaTitle: optionalText(input.metaTitle, 180, "Meta title"),
      metaDescription: optionalText(input.metaDescription, 320, "Meta description"),
      focusKeywords: optionalText(input.focusKeywords, 255, "Focus keywords"),
      robotsIndex: input.robotsIndex,
      robotsFollow: input.robotsFollow,
      ogTitle: optionalText(input.ogTitle, 180, "Social title"),
      ogDescription: optionalText(input.ogDescription, 320, "Social description"),
      ogImageUrl,
      ogImageAlt,
      status,
    }

    const expedition = input.id
      ? await tx.expedition.update({ where: { id: input.id }, data, select: { id: true, slug: true } })
      : await tx.expedition.create({ data, select: { id: true, slug: true } })

    await tx.itineraryDay.deleteMany({ where: { expeditionId: expedition.id } })
    if (days.length > 0) {
      await tx.itineraryDay.createMany({
        data: days.map((day) => ({
          expeditionId: expedition.id,
          dayNumber: day.dayNumber,
          title: day.title.trim(),
          body: day.body.trim(),
          sleepStop: day.sleepStop.trim(),
          sleepAltitudeMeters: day.sleepAltitudeMeters,
          movingHours: day.movingHours.toFixed(1),
        })),
      })
    }
    await tx.expeditionImage.deleteMany({ where: { expeditionId: expedition.id } })
    if (gallery.length > 0) {
      await tx.expeditionImage.createMany({
        data: gallery.map((image) => ({ ...image, expeditionId: expedition.id })),
      })
    }

    await writeAudit(tx, {
      actorStaffId: actor.id,
      action: AuditAction.EXPEDITION_SAVED,
      entityType: "Expedition",
      entityId: expedition.id,
      reason: input.id ? "Staff updated the expedition record" : "Staff created the expedition record",
      after: { slug, status, dayCount: days.length, galleryCount: gallery.length },
    })
    return expedition
  })

  revalidateTag("catalog", "seconds")
  return saved
}

export async function createDeparture(input: {
  expeditionId: string
  startDate: string
  endDate: string
  meetingPoint: string
  capacity: number
  priceRupees: string
  depositRupees: string
  policySnapshot: string
  status: string
}): Promise<{ id: string }> {
  const actor = await requireOpsStaff()
  await requireStaff(actor.id, StaffPermission.catalogWrite)
  if (!DAY.test(input.startDate) || !DAY.test(input.endDate) || input.endDate < input.startDate) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "End date must be on or after the start date")
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 30) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Capacity must be between 1 and 30 seats or bike slots")
  }
  const meetingPoint = input.meetingPoint.trim()
  if (meetingPoint.length < 3) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "A meeting point is required")
  const policySnapshot = input.policySnapshot.trim()
  if (policySnapshot.length < 20) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Write the cancellation terms that apply to this date")
  }
  const pricePaisa = rupeesToPaisa(input.priceRupees, "Price")
  const depositPaisa = rupeesToPaisa(input.depositRupees, "Deposit")
  if (pricePaisa <= 0) throw new DomainError(DomainErrorCode.PRICE_INVALID, "Price must be greater than zero")
  if (depositPaisa > pricePaisa) throw new DomainError(DomainErrorCode.PRICE_INVALID, "Deposit cannot exceed the price")
  const status = input.status === DepartureStatus.OPEN ? DepartureStatus.OPEN : DepartureStatus.DRAFT
  const start = new Date(`${input.startDate}T00:00:00.000Z`)
  const end = new Date(`${input.endDate}T00:00:00.000Z`)
  if (status === DepartureStatus.OPEN && !isFutureDepartureDate(start)) {
    throw new DomainError(DomainErrorCode.CONTENT_INVALID, "An open departure needs a start date after today in India")
  }

  const prisma = getPrisma()
  const created = await prisma.$transaction(async (tx) => {
    const expedition = await tx.expedition.findUnique({
      where: { id: input.expeditionId },
      select: { id: true },
    })
    if (!expedition) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "That expedition was not found")
    const departure = await tx.departure.create({
      data: {
        expeditionId: expedition.id,
        startDate: start,
        endDate: end,
        meetingPoint,
        capacity: input.capacity,
        seatsRemaining: input.capacity,
        pricePaisa,
        depositPaisa,
        status,
        policySnapshot,
      },
      select: { id: true },
    })
    await writeAudit(tx, {
      actorStaffId: actor.id,
      action: AuditAction.DEPARTURE_CREATED,
      entityType: "Departure",
      entityId: departure.id,
      reason: "Staff added a departure batch",
      after: { expeditionId: expedition.id, status, capacity: input.capacity, pricePaisa, depositPaisa },
    })
    return departure
  })

  revalidateTag("catalog", "seconds")
  return created
}

export async function updateEnquiryDesk(input: { id: string; status: string; note: string }): Promise<void> {
  const actor = await requireOpsStaff()
  await requireStaff(actor.id, StaffPermission.enquiryUpdate)
  const status = parseEnquiryStatus(input.status)
  const note = optionalText(input.note, 4000, "Internal note")
  const prisma = getPrisma()
  await prisma.$transaction(async (tx) => {
    const existing = await tx.enquiry.findUnique({ where: { id: input.id }, select: { id: true } })
    if (!existing) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "That enquiry was not found")
    const saved = await tx.enquiry.update({
      where: { id: existing.id },
      data: note ? { status, internalNote: note } : { status },
      select: { id: true, status: true },
    })
    if (note) {
      await tx.enquiryNote.create({
        data: { enquiryId: saved.id, authorStaffId: actor.id, body: note },
      })
    }
    await writeAudit(tx, {
      actorStaffId: actor.id,
      action: AuditAction.ENQUIRY_UPDATED,
      entityType: "Enquiry",
      entityId: saved.id,
      reason: note ? "Staff updated the enquiry and added a desk note" : "Staff updated the enquiry desk status",
      after: { status: saved.status, noteAdded: Boolean(note) },
    })
  })
}

function parseEnquiryStatus(value: string): EnquiryStatus {
  if (value === "OPEN" || value === "CONTACTED" || value === "QUOTED" || value === "CONVERTED" || value === "CLOSED") {
    return value
  }
  throw new DomainError(DomainErrorCode.CONTENT_INVALID, "Choose a desk status")
}

export type CmsExpeditionRecord = {
  id: string
  title: string
  slug: string
  regionName: string
  vehicleClass: VehicleClass
  durationDays: number
  maxAltitudeMeters: number
  difficulty: Difficulty
  seasonLabel: string
  summary: string
  inclusions: string
  exclusions: string
  permitNotes: string
  supportVehicleIncluded: boolean
  heroImageUrl: string
  heroImageAlt: string
  status: ExpeditionStatus
  metaTitle: string
  metaDescription: string
  focusKeywords: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  ogImageAlt: string
  days: CmsDay[]
  gallery: CmsImage[]
  departures: {
    id: string
    startDate: string
    endDate: string
    meetingPoint: string
    capacity: number
    seatsRemaining: number
    pricePaisa: number
    depositPaisa: number
    status: DepartureStatus
  }[]
}

const cmsSelect = {
  id: true,
  title: true,
  slug: true,
  vehicleClass: true,
  durationDays: true,
  maxAltitudeMeters: true,
  difficulty: true,
  seasonLabel: true,
  summary: true,
  inclusions: true,
  exclusions: true,
  permitNotes: true,
  supportVehicleIncluded: true,
  heroImageUrl: true,
  heroImageAlt: true,
  status: true,
  metaTitle: true,
  metaDescription: true,
  focusKeywords: true,
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: true,
  ogDescription: true,
  ogImageUrl: true,
  ogImageAlt: true,
  region: { select: { name: true } },
  days: {
    orderBy: { dayNumber: "asc" as const },
    select: {
      dayNumber: true,
      title: true,
      body: true,
      sleepStop: true,
      sleepAltitudeMeters: true,
      movingHours: true,
    },
  },
  gallery: { orderBy: { sortOrder: "asc" as const }, select: { url: true, alt: true } },
  departures: {
    orderBy: { startDate: "asc" as const },
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

export async function loadCmsExpedition(id: string): Promise<CmsExpeditionRecord | "offline" | null> {
  await requireOpsStaff()
  try {
    const row = await getPrisma().expedition.findUnique({ where: { id }, select: cmsSelect })
    if (!row) return null
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      regionName: row.region.name,
      vehicleClass: row.vehicleClass,
      durationDays: row.durationDays,
      maxAltitudeMeters: row.maxAltitudeMeters,
      difficulty: row.difficulty,
      seasonLabel: row.seasonLabel,
      summary: row.summary,
      inclusions: row.inclusions,
      exclusions: row.exclusions,
      permitNotes: row.permitNotes ?? "",
      supportVehicleIncluded: row.supportVehicleIncluded,
      heroImageUrl: row.heroImageUrl ?? "",
      heroImageAlt: row.heroImageAlt ?? "",
      status: row.status,
      metaTitle: row.metaTitle ?? "",
      metaDescription: row.metaDescription ?? "",
      focusKeywords: row.focusKeywords ?? "",
      robotsIndex: row.robotsIndex,
      robotsFollow: row.robotsFollow,
      ogTitle: row.ogTitle ?? "",
      ogDescription: row.ogDescription ?? "",
      ogImageUrl: row.ogImageUrl ?? "",
      ogImageAlt: row.ogImageAlt ?? "",
      days: row.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        body: day.body,
        sleepStop: day.sleepStop,
        sleepAltitudeMeters: day.sleepAltitudeMeters,
        movingHours: Number(day.movingHours),
      })),
      gallery: row.gallery,
      departures: row.departures.map((departure) => ({
        ...departure,
        startDate: departure.startDate.toISOString().slice(0, 10),
        endDate: departure.endDate.toISOString().slice(0, 10),
      })),
    }
  } catch {
    return "offline"
  }
}
