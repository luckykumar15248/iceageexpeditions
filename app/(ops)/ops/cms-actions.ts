"use server"

import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createDeparture, saveExpedition, updateEnquiryDesk, type CmsDay, type CmsImage } from "@/lib/cms"
import {
  dayTouched,
  departureTouched,
  imageTouched,
  listText,
  slugifyTitle,
  validateDraft,
  type ExpeditionDraft,
  type FieldErrors,
} from "@/lib/expedition-draft"
import { DomainError } from "@/lib/errors"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, requireStaff } from "@/lib/staff"

export type CmsFormState = { message: string; ok: boolean }

export async function saveExpeditionAction(_previous: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const id = read(formData, "id")
  try {
    const saved = await saveExpedition({
      id: id || undefined,
      title: read(formData, "title"),
      slug: read(formData, "slug"),
      regionName: read(formData, "regionName"),
      vehicleClass: read(formData, "vehicleClass"),
      durationDays: integer(read(formData, "durationDays")),
      maxAltitudeMeters: integer(read(formData, "maxAltitudeMeters")),
      difficulty: read(formData, "difficulty"),
      seasonLabel: read(formData, "seasonLabel"),
      summary: read(formData, "summary"),
      inclusions: read(formData, "inclusions"),
      exclusions: read(formData, "exclusions"),
      permitNotes: read(formData, "permitNotes"),
      supportVehicleIncluded: formData.get("supportVehicleIncluded") === "yes",
      heroImageUrl: read(formData, "heroImageUrl"),
      heroImageAlt: read(formData, "heroImageAlt"),
      status: read(formData, "status"),
      metaTitle: read(formData, "metaTitle"),
      metaDescription: read(formData, "metaDescription"),
      focusKeywords: read(formData, "focusKeywords"),
      robotsIndex: formData.get("robotsIndex") === "yes",
      robotsFollow: formData.get("robotsFollow") === "yes",
      ogTitle: read(formData, "ogTitle"),
      ogDescription: read(formData, "ogDescription"),
      ogImageUrl: read(formData, "ogImageUrl"),
      ogImageAlt: read(formData, "ogImageAlt"),
      days: readDays(formData),
      gallery: readGallery(formData),
    })
    redirect(`/ops/expeditions/${saved.id}?saved=1`)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { message: error instanceof DomainError ? error.message : "The expedition could not be saved.", ok: false }
  }
}

export async function createDepartureAction(_previous: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const expeditionId = read(formData, "expeditionId")
  try {
    await createDeparture({
      expeditionId,
      startDate: read(formData, "startDate"),
      endDate: read(formData, "endDate"),
      meetingPoint: read(formData, "meetingPoint"),
      capacity: integer(read(formData, "capacity")),
      priceRupees: read(formData, "priceRupees"),
      depositRupees: read(formData, "depositRupees"),
      policySnapshot: read(formData, "policySnapshot"),
      status: read(formData, "status"),
    })
    redirect(`/ops/expeditions/${expeditionId}?departure=1`)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { message: error instanceof DomainError ? error.message : "The departure could not be saved.", ok: false }
  }
}

export async function updateEnquiryAction(_previous: CmsFormState, formData: FormData): Promise<CmsFormState> {
  try {
    await updateEnquiryDesk({
      id: read(formData, "id"),
      status: read(formData, "status"),
      note: read(formData, "note"),
    })
    revalidatePath("/ops/enquiries")
    const note = read(formData, "note").trim()
    return { message: note ? "Note saved on this lead." : "Status saved.", ok: true }
  } catch (error) {
    if (isRedirect(error)) throw error
    return { message: error instanceof DomainError ? error.message : "The enquiry could not be updated.", ok: false }
  }
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function integer(value: string): number {
  if (!/^-?\d+$/.test(value.trim())) return Number.NaN
  return Number(value)
}

function texts(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value : ""))
}

function readDays(formData: FormData): CmsDay[] {
  const numbers = texts(formData, "dayNumber")
  const titles = texts(formData, "dayTitle")
  const bodies = texts(formData, "dayBody")
  const sleeps = texts(formData, "daySleep")
  const altitudes = texts(formData, "dayAltitude")
  const hours = texts(formData, "dayHours")
  const days: CmsDay[] = []
  for (let index = 0; index < titles.length; index += 1) {
    const title = titles[index] ?? ""
    const body = bodies[index] ?? ""
    const sleepStop = sleeps[index] ?? ""
    if (!title.trim() && !body.trim() && !sleepStop.trim()) continue
    days.push({
      dayNumber: integer(numbers[index] ?? ""),
      title,
      body,
      sleepStop,
      sleepAltitudeMeters: integer(altitudes[index] ?? ""),
      movingHours: Number(hours[index] ?? ""),
    })
  }
  return days
}

function readGallery(formData: FormData): CmsImage[] {
  const urls = texts(formData, "galleryUrl")
  const alts = texts(formData, "galleryAlt")
  const images: CmsImage[] = []
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index] ?? ""
    const alt = alts[index] ?? ""
    if (!url.trim() && !alt.trim()) continue
    images.push({ url, alt })
  }
  return images
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
}

export type WizardDepartureRow = {
  key: string
  id: string
  startDate: string
  endDate: string
  meetingPoint: string
  capacity: number
  seatsRemaining: number
  pricePaisa: number
  depositPaisa: number
  status: string
}

export type WizardSaveResult = {
  ok: boolean
  id?: string
  message: string
  fieldErrors: FieldErrors
  created: WizardDepartureRow[]
}

export async function saveExpeditionWizard(draft: ExpeditionDraft, intent: "draft" | "publish"): Promise<WizardSaveResult> {
  const fieldErrors = validateDraft(draft, intent)
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      id: draft.id,
      message: "Some fields need attention. Everything you entered is still on this page.",
      fieldErrors,
      created: [],
    }
  }

  let id = draft.id
  try {
    const saved = await saveExpedition(toExpeditionInput(draft, intent === "publish" ? "PUBLISHED" : "DRAFT"))
    id = saved.id
  } catch (error) {
    if (isRedirect(error)) throw error
    const message = error instanceof DomainError ? error.message : "The expedition could not be saved."
    return {
      ok: false,
      id,
      message,
      fieldErrors: message.toLowerCase().includes("slug") ? { slug: message } : {},
      created: [],
    }
  }
  if (!id) {
    return { ok: false, message: "The expedition could not be saved.", fieldErrors: {}, created: [] }
  }

  const created: WizardDepartureRow[] = []
  for (let index = 0; index < draft.departures.length; index += 1) {
    const row = draft.departures[index]
    if (!row || !departureTouched(row)) continue
    try {
      const saved = await createDeparture({
        expeditionId: id,
        startDate: row.startDate,
        endDate: row.endDate,
        meetingPoint: row.meetingPoint,
        capacity: Number(row.capacity),
        priceRupees: row.priceRupees,
        depositRupees: row.depositRupees,
        policySnapshot: row.policySnapshot,
        status: row.status,
      })
      created.push({
        key: row.key,
        id: saved.id,
        startDate: row.startDate,
        endDate: row.endDate,
        meetingPoint: row.meetingPoint.trim(),
        capacity: Number(row.capacity),
        seatsRemaining: Number(row.capacity),
        pricePaisa: Math.round(Number(row.priceRupees) * 100),
        depositPaisa: Math.round(Number(row.depositRupees) * 100),
        status: row.status,
      })
    } catch (error) {
      if (isRedirect(error)) throw error
      const message = error instanceof DomainError ? error.message : "A departure could not be saved."
      return {
        ok: false,
        id,
        message,
        fieldErrors: { [`departures.${row.key}.startDate`]: message },
        created,
      }
    }
  }

  return {
    ok: true,
    id,
    message: intent === "publish" ? "Route published. Dated batches stay closed until their own status is Open." : "Draft saved.",
    fieldErrors: {},
    created,
  }
}

export async function uploadOpsImage(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot upload images." }
  }

  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, message: "Choose an image file." }
  if (file.size <= 0 || file.size > 4 * 1024 * 1024) return { ok: false, message: "Images must be under 4 MB." }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = imageKind(bytes)
  if (!kind) return { ok: false, message: "Upload a JPEG, PNG, or WebP image." }
  const filename = `${randomBytes(16).toString("hex")}.${kind}`
  const directory = path.join(process.cwd(), "public", "uploads", "expeditions")
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), bytes)
  return { ok: true, url: `/uploads/expeditions/${filename}` }
}

function toExpeditionInput(draft: ExpeditionDraft, status: "DRAFT" | "PUBLISHED") {
  return {
    id: draft.id,
    title: draft.title,
    slug: slugifyTitle(draft.slug || draft.title),
    regionName: draft.regionName,
    vehicleClass: draft.vehicleClass,
    durationDays: Number(draft.durationDays),
    maxAltitudeMeters: Number(draft.maxAltitudeMeters),
    difficulty: draft.difficulty,
    seasonLabel: draft.seasonLabel,
    summary: draft.summary,
    inclusions: listText(draft.inclusionItems),
    exclusions: listText(draft.exclusionItems),
    permitNotes: draft.permitNotes,
    supportVehicleIncluded: draft.supportVehicleIncluded,
    heroImageUrl: draft.heroImageUrl,
    heroImageAlt: draft.heroImageAlt,
    status,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    focusKeywords: draft.focusKeywords,
    robotsIndex: draft.robotsIndex,
    robotsFollow: draft.robotsFollow,
    ogTitle: draft.ogTitle,
    ogDescription: draft.ogDescription,
    ogImageUrl: draft.ogImageUrl,
    ogImageAlt: draft.ogImageAlt,
    days: draft.days.filter(dayTouched).map((day) => ({
      dayNumber: Number(day.dayNumber),
      title: day.title,
      body: day.body,
      sleepStop: day.sleepStop,
      sleepAltitudeMeters: Number(day.sleepAltitudeMeters),
      movingHours: Number(day.movingHours),
    })),
    gallery: draft.gallery.filter(imageTouched).map((image) => ({ url: image.url, alt: image.alt })),
  }
}

function imageKind(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp"
  }
  return null
}
