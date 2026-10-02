import { z } from "zod"
import { isFutureDepartureDate } from "@/lib/dates"

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export type DraftListItem = { key: string; text: string; included: boolean }

export type DraftDay = {
  key: string
  dayNumber: string
  title: string
  body: string
  sleepStop: string
  sleepAltitudeMeters: string
  movingHours: string
}

export type DraftImage = { key: string; url: string; alt: string }

export type DraftDeparture = {
  key: string
  startDate: string
  endDate: string
  meetingPoint: string
  capacity: string
  priceRupees: string
  depositRupees: string
  policySnapshot: string
  status: "DRAFT" | "OPEN"
}

export type ExpeditionDraft = {
  id?: string
  title: string
  slug: string
  regionName: string
  vehicleClass: "SUV_4X4" | "MOTORBIKE"
  durationDays: string
  maxAltitudeMeters: string
  difficulty: "MODERATE" | "CHALLENGING" | "STRENUOUS" | "EXTREME"
  seasonLabel: string
  summary: string
  inclusionItems: DraftListItem[]
  exclusionItems: DraftListItem[]
  permitNotes: string
  supportVehicleIncluded: boolean
  heroImageUrl: string
  heroImageAlt: string
  metaTitle: string
  metaDescription: string
  focusKeywords: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  ogImageAlt: string
  days: DraftDay[]
  gallery: DraftImage[]
  departures: DraftDeparture[]
}

export type FieldErrors = Record<string, string>

export const WIZARD_STEPS = [
  { label: "Core", hint: "Route facts" },
  { label: "Itinerary", hint: "Days and inclusions" },
  { label: "Departures", hint: "Dates and price" },
  { label: "Search", hint: "Metadata and share image" },
] as const

export function slugifyTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140)
}

export function stepOfField(key: string): number {
  if (key.startsWith("days") || key.startsWith("inclusion") || key.startsWith("exclusion") || key === "permitNotes") return 1
  if (key.startsWith("departures")) return 2
  if (
    key.startsWith("meta") ||
    key.startsWith("og") ||
    key === "focusKeywords" ||
    key === "robotsIndex" ||
    key === "robotsFollow"
  ) {
    return 3
  }
  return 0
}

export function firstInvalidStep(errors: FieldErrors): number {
  const steps = Object.keys(errors).map(stepOfField)
  return steps.length === 0 ? 0 : Math.min(...steps)
}

export function dayTouched(day: DraftDay): boolean {
  return [day.title, day.body, day.sleepStop, day.sleepAltitudeMeters, day.movingHours].some((value) => value.trim() !== "")
}

export function departureTouched(row: DraftDeparture): boolean {
  return [row.startDate, row.endDate, row.meetingPoint, row.capacity, row.priceRupees, row.depositRupees, row.policySnapshot].some(
    (value) => value.trim() !== "",
  )
}

export function imageTouched(image: DraftImage): boolean {
  return image.url.trim() !== "" || image.alt.trim() !== ""
}

export function listText(items: DraftListItem[]): string {
  return items
    .filter((item) => item.included && item.text.trim())
    .map((item) => item.text.trim())
    .join("\n")
}

const draftSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    title: z.string().max(180),
    slug: z.string().max(140),
    regionName: z.string().max(120),
    vehicleClass: z.enum(["SUV_4X4", "MOTORBIKE"]),
    durationDays: z.string().max(8),
    maxAltitudeMeters: z.string().max(8),
    difficulty: z.enum(["MODERATE", "CHALLENGING", "STRENUOUS", "EXTREME"]),
    seasonLabel: z.string().max(120),
    summary: z.string().max(8000),
    inclusionItems: z.array(z.object({ key: z.string().min(1).max(80), text: z.string().max(500), included: z.boolean() })).max(40),
    exclusionItems: z.array(z.object({ key: z.string().min(1).max(80), text: z.string().max(500), included: z.boolean() })).max(40),
    permitNotes: z.string().max(5000),
    supportVehicleIncluded: z.boolean(),
    heroImageUrl: z.string().max(500),
    heroImageAlt: z.string().max(240),
    metaTitle: z.string().max(180),
    metaDescription: z.string().max(320),
    focusKeywords: z.string().max(255),
    robotsIndex: z.boolean(),
    robotsFollow: z.boolean(),
    ogTitle: z.string().max(180),
    ogDescription: z.string().max(320),
    ogImageUrl: z.string().max(500),
    ogImageAlt: z.string().max(240),
    days: z
      .array(
        z.object({
          key: z.string().min(1).max(80),
          dayNumber: z.string().max(8),
          title: z.string().max(180),
          body: z.string().max(8000),
          sleepStop: z.string().max(180),
          sleepAltitudeMeters: z.string().max(8),
          movingHours: z.string().max(8),
        }),
      )
      .max(40),
    gallery: z.array(z.object({ key: z.string().min(1).max(80), url: z.string().max(500), alt: z.string().max(240) })).max(16),
    departures: z
      .array(
        z.object({
          key: z.string().min(1).max(80),
          startDate: z.string().max(10),
          endDate: z.string().max(10),
          meetingPoint: z.string().max(255),
          capacity: z.string().max(8),
          priceRupees: z.string().max(16),
          depositRupees: z.string().max(16),
          policySnapshot: z.string().max(5000),
          status: z.enum(["DRAFT", "OPEN"]),
        }),
      )
      .max(30),
  })
  .strict()

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, max) : ""
}

function listItems(value: unknown): DraftListItem[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 40).map((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    return {
      key: clean(row.key, 80) || `item-${index + 1}`,
      text: clean(row.text, 500),
      included: row.included !== false,
    }
  })
}

export function normalizeDraft(value: unknown): ExpeditionDraft {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const difficulty =
    raw.difficulty === "MODERATE" || raw.difficulty === "STRENUOUS" || raw.difficulty === "EXTREME" || raw.difficulty === "CHALLENGING"
      ? raw.difficulty
      : "CHALLENGING"
  const days = Array.isArray(raw.days) ? raw.days.slice(0, 40).map((day, index) => normalizeDay(day, index)) : []
  return {
    id: clean(raw.id, 64) || undefined,
    title: clean(raw.title, 180),
    slug: clean(raw.slug, 140),
    regionName: clean(raw.regionName, 120),
    vehicleClass: raw.vehicleClass === "MOTORBIKE" ? "MOTORBIKE" : "SUV_4X4",
    durationDays: clean(raw.durationDays, 8),
    maxAltitudeMeters: clean(raw.maxAltitudeMeters, 8),
    difficulty,
    seasonLabel: clean(raw.seasonLabel, 120),
    summary: clean(raw.summary, 8000),
    inclusionItems: listItems(raw.inclusionItems),
    exclusionItems: listItems(raw.exclusionItems),
    permitNotes: clean(raw.permitNotes, 5000),
    supportVehicleIncluded: raw.supportVehicleIncluded === true,
    heroImageUrl: clean(raw.heroImageUrl, 500),
    heroImageAlt: clean(raw.heroImageAlt, 240),
    metaTitle: clean(raw.metaTitle, 180),
    metaDescription: clean(raw.metaDescription, 320),
    focusKeywords: clean(raw.focusKeywords, 255),
    robotsIndex: raw.robotsIndex !== false,
    robotsFollow: raw.robotsFollow !== false,
    ogTitle: clean(raw.ogTitle, 180),
    ogDescription: clean(raw.ogDescription, 320),
    ogImageUrl: clean(raw.ogImageUrl, 500),
    ogImageAlt: clean(raw.ogImageAlt, 240),
    days: days.length > 0 ? days : [normalizeDay({}, 0)],
    gallery: Array.isArray(raw.gallery) ? raw.gallery.slice(0, 16).map((image, index) => normalizeImage(image, index)) : [],
    departures: Array.isArray(raw.departures) ? raw.departures.slice(0, 30).map((row, index) => normalizeDeparture(row, index)) : [],
  }
}

function normalizeDay(value: unknown, index: number): DraftDay {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    key: clean(row.key, 80) || `day-${index + 1}`,
    dayNumber: clean(row.dayNumber, 8) || String(index + 1),
    title: clean(row.title, 180),
    body: clean(row.body, 8000),
    sleepStop: clean(row.sleepStop, 180),
    sleepAltitudeMeters: clean(row.sleepAltitudeMeters, 8),
    movingHours: clean(row.movingHours, 8),
  }
}

function normalizeImage(value: unknown, index: number): DraftImage {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return { key: clean(row.key, 80) || `image-${index + 1}`, url: clean(row.url, 500), alt: clean(row.alt, 240) }
}

function normalizeDeparture(value: unknown, index: number): DraftDeparture {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    key: clean(row.key, 80) || `departure-${index + 1}`,
    startDate: clean(row.startDate, 10),
    endDate: clean(row.endDate, 10),
    meetingPoint: clean(row.meetingPoint, 255),
    capacity: clean(row.capacity, 8),
    priceRupees: clean(row.priceRupees, 16),
    depositRupees: clean(row.depositRupees, 16),
    policySnapshot: clean(row.policySnapshot, 5000),
    status: row.status === "OPEN" ? "OPEN" : "DRAFT",
  }
}

function zodFieldErrors(issues: { message: string; path: ReadonlyArray<PropertyKey> }[], draft: ExpeditionDraft): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of issues) {
    const key = issueKey(issue.path, draft)
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

function issueKey(path: ReadonlyArray<PropertyKey>, draft: ExpeditionDraft): string {
  const [head, index, field] = path
  if (head === "days" && typeof index === "number") {
    const day = draft.days[index]
    return day ? `days.${day.key}.${String(field ?? "title")}` : "days"
  }
  if (head === "departures" && typeof index === "number") {
    const row = draft.departures[index]
    return row ? `departures.${row.key}.${String(field ?? "startDate")}` : "departures"
  }
  if (head === "gallery" && typeof index === "number") {
    const image = draft.gallery[index]
    return image ? `gallery.${image.key}.${String(field ?? "url")}` : "gallery"
  }
  return path.length > 0 ? path.map(String).join(".") : "form"
}

export function validateDraft(value: unknown, intent: "draft" | "publish"): FieldErrors {
  const draft = normalizeDraft(value)
  const parsed = draftSchema.safeParse(draft)
  if (!parsed.success) return zodFieldErrors(parsed.error.issues, draft)
  return ruleErrors(parsed.data, intent)
}

function ruleErrors(draft: ExpeditionDraft, intent: "draft" | "publish"): FieldErrors {
  const errors: FieldErrors = {}
  const title = draft.title.trim()
  const slug = slugifyTitle(draft.slug || draft.title)
  const regionName = draft.regionName.trim()
  const seasonLabel = draft.seasonLabel.trim()
  const summary = draft.summary.trim()

  if (title.length < 3 || title.length > 180) errors.title = "Title must be between 3 and 180 characters."
  if (!SLUG.test(slug)) errors.slug = "Slug must be lowercase words separated by hyphens."
  if (regionName.length < 2) errors.regionName = "A region name is required."
  else if (!SLUG.test(slugifyTitle(regionName))) errors.regionName = "Region name needs letters or numbers."
  if (!/^\d+$/.test(draft.durationDays.trim())) errors.durationDays = "Enter the number of days."
  else {
    const days = Number(draft.durationDays)
    if (days < 1 || days > 40) errors.durationDays = "Duration must be between 1 and 40 days."
  }
  if (!/^\d+$/.test(draft.maxAltitudeMeters.trim())) errors.maxAltitudeMeters = "Enter the max altitude in metres."
  else {
    const altitude = Number(draft.maxAltitudeMeters)
    if (altitude < 500 || altitude > 8000) errors.maxAltitudeMeters = "Max altitude must be between 500 and 8000 metres."
  }
  if (seasonLabel.length < 2) errors.seasonLabel = "A season label is required."
  if (summary.length < 20) errors.summary = "Summary needs at least a short paragraph."

  const heroProblem = mediaProblem(draft.heroImageUrl, "Hero image")
  if (heroProblem) errors.heroImageUrl = heroProblem
  if (draft.heroImageUrl.trim() && draft.heroImageAlt.trim().length < 2) errors.heroImageAlt = "A hero image needs alt text."
  if (!draft.heroImageUrl.trim() && draft.heroImageAlt.trim()) errors.heroImageUrl = "Add the hero image, or clear the alt text."
  if (draft.heroImageAlt.trim().length > 240) errors.heroImageAlt = "Hero alt text is too long."

  draft.gallery.forEach((image, index) => {
    if (!imageTouched(image)) return
    const problem = mediaProblem(image.url, `Gallery image ${index + 1}`)
    if (!image.url.trim()) errors[`gallery.${image.key}.url`] = "Add an image URL or remove this row."
    else if (problem) errors[`gallery.${image.key}.url`] = problem
    if (image.alt.trim().length < 3) errors[`gallery.${image.key}.alt`] = "Each gallery image needs alt text."
    else if (image.alt.trim().length > 240) errors[`gallery.${image.key}.alt`] = "Alt text is too long."
  })
  if (draft.gallery.filter(imageTouched).length > 12) errors.gallery = "A route can store up to 12 gallery images."

  const touchedDays = draft.days.filter(dayTouched)
  if (intent === "publish" && touchedDays.length === 0) {
    errors.days = "A published route needs at least one itinerary day."
  }
  const seen = new Set<number>()
  draft.days.forEach((day) => {
    if (!dayTouched(day)) return
    const dayNumber = Number(day.dayNumber)
    if (!/^\d+$/.test(day.dayNumber.trim()) || dayNumber < 1 || dayNumber > 40) {
      errors[`days.${day.key}.dayNumber`] = "Enter a day number from 1 to 40."
    } else if (seen.has(dayNumber)) {
      errors[`days.${day.key}.dayNumber`] = "Each day number must be unique."
    } else {
      seen.add(dayNumber)
    }
    if (day.title.trim().length < 2) errors[`days.${day.key}.title`] = "This day needs a title."
    if (day.body.trim().length < 10) errors[`days.${day.key}.body`] = "This day needs a description."
    if (day.sleepStop.trim().length < 2) {
      errors[`days.${day.key}.sleepStop`] = "Name the sleep stop, or write “Not set” if ops has not named it."
    }
    if (!/^\d+$/.test(day.sleepAltitudeMeters.trim())) {
      errors[`days.${day.key}.sleepAltitudeMeters`] = "Enter the sleep altitude in metres."
    } else {
      const altitude = Number(day.sleepAltitudeMeters)
      if (altitude < 0 || altitude > 8000) errors[`days.${day.key}.sleepAltitudeMeters`] = "Sleep altitude must be between 0 and 8000 metres."
    }
    if (!/^\d+(\.\d{1,2})?$/.test(day.movingHours.trim())) {
      errors[`days.${day.key}.movingHours`] = "Enter moving hours from 0 to 18."
    } else {
      const hours = Number(day.movingHours)
      if (hours < 0 || hours > 18) errors[`days.${day.key}.movingHours`] = "Moving hours must be between 0 and 18."
    }
  })

  if (draft.permitNotes.trim().length > 5000) errors.permitNotes = "Permit notes are too long."

  draft.departures.forEach((row) => {
    if (!departureTouched(row)) return
    if (!DAY.test(row.startDate)) errors[`departures.${row.key}.startDate`] = "Choose a start date."
    if (!DAY.test(row.endDate)) errors[`departures.${row.key}.endDate`] = "Choose an end date."
    if (DAY.test(row.startDate) && DAY.test(row.endDate) && row.endDate < row.startDate) {
      errors[`departures.${row.key}.endDate`] = "End date must be on or after the start date."
    }
    if (row.meetingPoint.trim().length < 3) errors[`departures.${row.key}.meetingPoint`] = "A meeting point is required."
    if (!/^\d+$/.test(row.capacity.trim()) || Number(row.capacity) < 1 || Number(row.capacity) > 30) {
      errors[`departures.${row.key}.capacity`] = "Capacity must be between 1 and 30 seats or bike slots."
    }
    const price = rupeesToPaisa(row.priceRupees)
    const deposit = rupeesToPaisa(row.depositRupees)
    if (price == null || price <= 0) errors[`departures.${row.key}.priceRupees`] = "Price must be a rupee amount above zero."
    if (deposit == null) errors[`departures.${row.key}.depositRupees`] = "Deposit must be a rupee amount."
    else if (price != null && deposit > price) errors[`departures.${row.key}.depositRupees`] = "Deposit cannot exceed the price."
    if (row.policySnapshot.trim().length < 20) {
      errors[`departures.${row.key}.policySnapshot`] = "Write the cancellation terms that apply to this date."
    }
    if (row.status === "OPEN" && DAY.test(row.startDate) && !isFutureDepartureDate(new Date(`${row.startDate}T00:00:00.000Z`))) {
      errors[`departures.${row.key}.startDate`] = "An open departure needs a start date after today in India."
    }
  })

  lengthLimit(errors, "metaTitle", draft.metaTitle, 180, "Meta title")
  lengthLimit(errors, "metaDescription", draft.metaDescription, 320, "Meta description")
  lengthLimit(errors, "focusKeywords", draft.focusKeywords, 255, "Focus keywords")
  lengthLimit(errors, "ogTitle", draft.ogTitle, 180, "Social title")
  lengthLimit(errors, "ogDescription", draft.ogDescription, 320, "Social description")
  const ogProblem = mediaProblem(draft.ogImageUrl, "Social image")
  if (ogProblem) errors.ogImageUrl = ogProblem
  if (draft.ogImageUrl.trim() && draft.ogImageAlt.trim().length < 2) errors.ogImageAlt = "A social image needs alt text."
  if (!draft.ogImageUrl.trim() && draft.ogImageAlt.trim()) errors.ogImageUrl = "Add the social image, or clear the alt text."
  if (draft.ogImageAlt.trim().length > 240) errors.ogImageAlt = "Social image alt text is too long."

  return errors
}

export function errorsForStep(errors: FieldErrors, step: number): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => stepOfField(key) === step))
}

function lengthLimit(errors: FieldErrors, key: string, value: string, max: number, label: string) {
  if (value.trim().length > max) errors[key] = `${label} is too long.`
}

function mediaProblem(value: string, label: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed.length > 500 ? `${label} is too long.` : null
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:") return `${label} must use https.`
  } catch {
    return `${label} must be a site path or an https URL.`
  }
  return trimmed.length > 500 ? `${label} is too long.` : null
}

function rupeesToPaisa(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const paisa = Math.round(Number(trimmed) * 100)
  if (!Number.isSafeInteger(paisa) || paisa < 0) return null
  return paisa
}
