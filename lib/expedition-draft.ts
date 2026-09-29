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
  { label: "Basics", hint: "Route and hero" },
  { label: "Itinerary", hint: "Days and inclusions" },
  { label: "Departures", hint: "Dates and price" },
  { label: "Search", hint: "Metadata and social" },
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

export function validateDraft(draft: ExpeditionDraft, intent: "draft" | "publish"): FieldErrors {
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
    if (!/^\d+(\.\d)?$/.test(day.movingHours.trim())) {
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
