"use server"

import { randomBytes } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { AuditAction } from "@/app/generated/prisma/client"
import { createDeparture, saveExpedition, updateEnquiryDesk, type CmsDay, type CmsImage } from "@/lib/cms"
import { writeAudit } from "@/lib/audit"
import { getPrisma, isUniqueConflict } from "@/lib/db"
import {
  dayTouched,
  departureTouched,
  imageTouched,
  listText,
  normalizeDraft,
  slugifyTitle,
  validateDraft,
  type ExpeditionDraft,
  type FieldErrors,
} from "@/lib/expedition-draft"
import { DomainError } from "@/lib/errors"
import { IMAGE_MAX_BYTES, IMAGE_MAX_MB, VIDEO_MAX_BYTES, VIDEO_MAX_MB, isGalleryCategory } from "@/lib/media-format"
import {
  imageKindFromBytes,
  imageMime,
  publicUploadPath,
  readMp4DurationSeconds,
  streamUploadToDisk,
  uploadDir,
  videoKindFromBytes,
  videoMime,
} from "@/lib/media-file"
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

export async function saveExpeditionWizard(input: ExpeditionDraft, intent: "draft" | "publish"): Promise<WizardSaveResult> {
  const draft = normalizeDraft(input)
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
    const failure = saveFailure(error)
    return { ok: false, id, message: failure.message, fieldErrors: failure.fieldErrors, created: [] }
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
      const failure = saveFailure(error, "A departure could not be saved. The route itself is still saved.")
      return {
        ok: false,
        id,
        message: failure.message,
        fieldErrors: { [`departures.${row.key}.startDate`]: failure.message },
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
  const kind = imageKindFromBytes(bytes)
  if (!kind) return { ok: false, message: "Upload a JPEG, PNG, or WebP image." }
  const filename = `${randomBytes(16).toString("hex")}.${kind}`
  const folder = uploadDir("expeditions")
  try {
    await mkdir(folder.abs, { recursive: true })
    await writeFile(path.join(/*turbopackIgnore: true*/ folder.abs, filename), bytes)
  } catch (error) {
    console.error("[media] expedition image write failed", error instanceof Error ? error.message : String(error))
    return { ok: false, message: "The image could not be written to disk." }
  }
  return { ok: true, url: `${folder.urlPrefix}/${filename}` }
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

function saveFailure(error: unknown, fallback = "The expedition could not be saved. Your entries are still on this page."): {
  message: string
  fieldErrors: FieldErrors
} {
  if (error instanceof DomainError) {
    const slug = error.message.toLowerCase().includes("slug")
    return { message: error.message, fieldErrors: slug ? { slug: error.message } : {} }
  }
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
  if (code === "P2002") {
    return { message: "That slug is already used by another route.", fieldErrors: { slug: "That slug is already used by another route." } }
  }
  if (code === "P2025") {
    return { message: "That expedition record was not found.", fieldErrors: {} }
  }
  if (code === "P2003") {
    return { message: "A linked region record could not be saved.", fieldErrors: { regionName: "A linked region record could not be saved." } }
  }
  console.error("[cms] expedition save failed", { code: code || "UNEXPECTED" })
  return { message: fallback, fieldErrors: {} }
}

// ─── Media library ────────────────────────────────────────────────────────────

export type MediaUploadResult =
  | {
      ok: true
      id: string
      url: string
      filename: string
      originalName: string
      mimeType: string
      sizeBytes: number
      assetType: "IMAGE" | "VIDEO"
      durationSeconds: number | null
    }
  | { ok: false; message: string }

export async function uploadMediaAction(formData: FormData): Promise<MediaUploadResult> {
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot upload media." }
  }

  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, message: "Choose a file to upload." }
  if (file.size <= 0) return { ok: false, message: "The file is empty." }
  if (file.size > VIDEO_MAX_BYTES) {
    return { ok: false, message: `Files must be under ${VIDEO_MAX_MB} MB. Compress expedition video before upload.` }
  }

  const reader = file.stream().getReader()
  const first = await reader.read()
  const head = first.value ?? new Uint8Array()
  const imgKind = imageKindFromBytes(head)
  const vidKind = imgKind ? null : videoKindFromBytes(head, file.name)

  if (imgKind && file.size > IMAGE_MAX_BYTES) {
    await reader.cancel()
    return { ok: false, message: `Images must be under ${IMAGE_MAX_MB} MB.` }
  }
  if (!imgKind && !vidKind) {
    await reader.cancel()
    return { ok: false, message: "Upload a JPEG, PNG, WebP image or an MP4/WebM video." }
  }

  const isVideo = Boolean(vidKind)
  const ext = imgKind ? (imgKind === "jpg" ? "jpg" : imgKind) : vidKind!
  const safeName = `${randomBytes(16).toString("hex")}.${ext}`
  const folder = uploadDir(isVideo ? "videos" : "media")
  const destPath = path.join(/*turbopackIgnore: true*/ folder.abs, safeName)
  const url = `${folder.urlPrefix}/${safeName}`
  const mimeType = imgKind ? imageMime(imgKind) : videoMime(vidKind!)
  const assetType: "IMAGE" | "VIDEO" = isVideo ? "VIDEO" : "IMAGE"

  let prefix: Uint8Array
  try {
    prefix = await streamUploadToDisk(destPath, head, reader)
  } catch (error) {
    console.error("[media] write failed", error instanceof Error ? error.message : String(error))
    return { ok: false, message: "The file could not be written to disk." }
  }

  const durationSeconds = isVideo && vidKind === "mp4" ? readMp4DurationSeconds(prefix) : null
  const prisma = getPrisma()
  try {
    const row = await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          assetType: isVideo ? "VIDEO" : "IMAGE",
          filename: safeName,
          originalName: file.name.slice(0, 255),
          url,
          mimeType,
          sizeBytes: file.size,
          durationSeconds,
          uploadedByStaffId: actor.id,
        },
      })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.MEDIA_UPLOADED,
        entityType: "MediaAsset",
        entityId: asset.id,
        reason: isVideo ? "Staff uploaded a video" : "Staff uploaded an image",
        after: { filename: safeName, url, mimeType, sizeBytes: file.size, assetType, durationSeconds },
      })
      return asset
    })
    revalidatePath("/ops/media")
    revalidatePath("/ops/hero-slides")
    revalidatePath("/ops/galleries")
    return {
      ok: true,
      id: row.id,
      url,
      filename: safeName,
      originalName: file.name.slice(0, 255),
      mimeType,
      sizeBytes: file.size,
      assetType,
      durationSeconds,
    }
  } catch {
    try {
      await unlink(destPath)
    } catch {
      /* best effort */
    }
    return { ok: false, message: "The file was saved but the database record could not be created." }
  }
}

export async function deleteMediaAction(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid asset ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot delete media." }
  }
  const prisma = getPrisma()
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!asset) return { ok: false, message: "Asset not found." }
    const [usedBySlide, usedByGallery] = await Promise.all([
      prisma.heroSlide.count({ where: { mediaAssetId: id } }),
      prisma.galleryItem.count({ where: { mediaAssetId: id } }),
    ])
    if (usedBySlide > 0) return { ok: false, message: "This asset is used by a hero slide. Remove it from the slide first." }
    if (usedByGallery > 0) return { ok: false, message: "This asset is used by a gallery item. Remove it from the gallery first." }
    await prisma.$transaction(async (tx) => {
      await tx.mediaAsset.delete({ where: { id } })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.MEDIA_DELETED,
        entityType: "MediaAsset",
        entityId: id,
        reason: "Staff deleted a media asset",
        after: { filename: asset.filename, url: asset.url },
      })
    })
    const filePath = publicUploadPath(asset.url)
    if (filePath) {
      try {
        await unlink(filePath)
      } catch {
        /* file may be missing */
      }
    }
    revalidatePath("/ops/media")
    revalidatePath("/ops/hero-slides")
    revalidatePath("/ops/galleries")
    return { ok: true, message: "Asset deleted." }
  } catch {
    return { ok: false, message: "The asset could not be deleted." }
  }
}

export async function updateMediaAltAction(id: string, altText: string): Promise<{ ok: boolean; message: string }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid asset ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot edit media." }
  }
  const sanitized = String(altText ?? "").slice(0, 240)
  const prisma = getPrisma()
  try {
    await prisma.mediaAsset.update({ where: { id }, data: { altText: sanitized || null } })
    revalidatePath("/ops/media")
    return { ok: true, message: "Alt text updated." }
  } catch {
    return { ok: false, message: "The alt text could not be saved." }
  }
}

export async function updateMediaDurationAction(id: string, durationSeconds: number): Promise<{ ok: boolean; message: string; durationSeconds?: number }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid asset ID." }
  const seconds = Math.round(Number(durationSeconds))
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 60 * 60 * 6) {
    return { ok: false, message: "Duration must be between 1 second and 6 hours." }
  }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot edit media." }
  }
  const prisma = getPrisma()
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { assetType: true } })
    if (!asset) return { ok: false, message: "Asset not found." }
    if (asset.assetType !== "VIDEO") return { ok: false, message: "Duration applies to videos only." }
    await prisma.mediaAsset.update({ where: { id }, data: { durationSeconds: seconds } })
    revalidatePath("/ops/media")
    return { ok: true, message: "Duration saved.", durationSeconds: seconds }
  } catch {
    return { ok: false, message: "The duration could not be saved." }
  }
}

// ─── Hero slides ──────────────────────────────────────────────────────────────

export type HeroSlideInput = {
  id?: string
  kicker: string
  title: string
  body: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
  /** Background image URL — used as poster when videoUrl is also set. */
  imageUrl: string
  imageAlt: string
  /** Optional background video URL from the media library. Empty string = no video. */
  videoUrl: string
  mediaAssetId: string
  active: boolean
  sortOrder: number
}

export type HeroSlideSaveResult = { ok: boolean; message: string; id?: string }

function validateSlideInput(input: HeroSlideInput): string | null {
  if (!input.kicker.trim() || input.kicker.length > 120) return "Kicker must be between 1 and 120 characters."
  if (!input.title.trim() || input.title.length > 180) return "Title must be between 1 and 180 characters."
  if (!input.body.trim()) return "Description is required."
  if (!input.primaryLabel.trim() || input.primaryLabel.length > 80) return "Primary button label is required."
  if (!input.primaryHref.trim() || input.primaryHref.length > 500) return "Primary button link is required."
  if (input.secondaryLabel && input.secondaryLabel.length > 80) return "Secondary label is too long."
  if (input.secondaryHref && input.secondaryHref.length > 500) return "Secondary link is too long."
  if (!input.imageUrl.trim() || input.imageUrl.length > 500) return "Image URL is required (used as poster for video slides)."
  if (!input.imageAlt.trim() || input.imageAlt.length > 240) return "Image alt text is required."
  if (input.videoUrl && input.videoUrl.length > 500) return "Video URL is too long."
  const href = input.primaryHref.trim()
  if (!href.startsWith("/") && !href.startsWith("https://")) return "Primary link must start with / or https://."
  return null
}

export async function saveHeroSlideAction(input: HeroSlideInput): Promise<HeroSlideSaveResult> {
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot manage hero slides." }
  }
  const inputError = validateSlideInput(input)
  if (inputError) return { ok: false, message: inputError }
  const data = {
    kicker: input.kicker.trim().toUpperCase(),
    title: input.title.trim(),
    body: input.body.trim(),
    primaryLabel: input.primaryLabel.trim(),
    primaryHref: input.primaryHref.trim(),
    secondaryLabel: input.secondaryLabel.trim() || null,
    secondaryHref: input.secondaryHref.trim() || null,
    imageUrl: input.imageUrl.trim(),
    imageAlt: input.imageAlt.trim(),
    videoUrl: input.videoUrl.trim() || null,
    mediaAssetId: input.mediaAssetId.trim() || null,
    active: Boolean(input.active),
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  }
  const prisma = getPrisma()
  try {
    let id: string
    await prisma.$transaction(async (tx) => {
      if (input.id) {
        await tx.heroSlide.update({ where: { id: input.id }, data })
        id = input.id
        await writeAudit(tx, {
          actorStaffId: actor.id,
          action: AuditAction.HERO_SLIDE_SAVED,
          entityType: "HeroSlide",
          entityId: id,
          reason: "Staff updated a hero slide",
          after: { title: data.title, active: data.active },
        })
      } else {
        const row = await tx.heroSlide.create({ data })
        id = row.id
        await writeAudit(tx, {
          actorStaffId: actor.id,
          action: AuditAction.HERO_SLIDE_SAVED,
          entityType: "HeroSlide",
          entityId: id,
          reason: "Staff created a hero slide",
          after: { title: data.title },
        })
      }
    })
    revalidateTag("hero-slides", "seconds")
    revalidatePath("/ops/hero-slides")
    revalidatePath("/")   // bust homepage ISR cache
    return { ok: true, message: input.id ? "Slide updated." : "Slide created.", id: id! }
  } catch {
    return { ok: false, message: "The slide could not be saved." }
  }
}

export async function deleteHeroSlideAction(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid slide ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot delete hero slides." }
  }
  const prisma = getPrisma()
  try {
    const slide = await prisma.heroSlide.findUnique({ where: { id } })
    if (!slide) return { ok: false, message: "Slide not found." }
    await prisma.$transaction(async (tx) => {
      await tx.heroSlide.delete({ where: { id } })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.HERO_SLIDE_DELETED,
        entityType: "HeroSlide",
        entityId: id,
        reason: "Staff deleted a hero slide",
        after: { title: slide.title },
      })
    })
    revalidateTag("hero-slides", "seconds")
    revalidatePath("/ops/hero-slides")
    revalidatePath("/")   // bust homepage ISR cache
    return { ok: true, message: "Slide deleted." }
  } catch {
    return { ok: false, message: "The slide could not be deleted." }
  }
}

export async function reorderHeroSlidesAction(orderedIds: string[]): Promise<{ ok: boolean; message: string }> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return { ok: false, message: "No order provided." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot reorder slides." }
  }
  const prisma = getPrisma()
  try {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        orderedIds.map((slideId, idx) => tx.heroSlide.update({ where: { id: slideId }, data: { sortOrder: idx } })),
      )
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.HERO_SLIDES_REORDERED,
        entityType: "HeroSlide",
        entityId: "all",
        reason: "Staff reordered hero slides",
        after: { order: orderedIds },
      })
    })
    revalidateTag("hero-slides", "seconds")
    revalidatePath("/ops/hero-slides")
    revalidatePath("/")   // bust homepage ISR cache
    return { ok: true, message: "Order saved." }
  } catch {
    return { ok: false, message: "The order could not be saved." }
  }
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export type GalleryItemSaveResult = { ok: boolean; message: string; id?: string; category?: string | null }

export async function addGalleryItemAction(mediaAssetId: string, caption: string, category = ""): Promise<GalleryItemSaveResult> {
  if (!mediaAssetId || typeof mediaAssetId !== "string" || mediaAssetId.length > 64) return { ok: false, message: "Invalid asset ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot manage the gallery." }
  }
  const trimmedCategory = category.trim()
  const savedCategory = trimmedCategory && isGalleryCategory(trimmedCategory) ? trimmedCategory : null
  const prisma = getPrisma()
  try {
    const [asset, duplicate] = await Promise.all([
      prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } }),
      prisma.galleryItem.findUnique({ where: { mediaAssetId } }),
    ])
    if (!asset) return { ok: false, message: "Media asset not found." }
    if (duplicate) return { ok: false, message: "This asset is already in the gallery. Pick a different file from the library." }
    const maxOrder = await prisma.galleryItem.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1
    const row = await prisma.$transaction(async (tx) => {
      const item = await tx.galleryItem.create({
        data: {
          mediaAssetId,
          caption: caption.trim().slice(0, 300) || null,
          category: savedCategory,
          sortOrder: nextOrder,
        },
      })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.GALLERY_ITEM_ADDED,
        entityType: "GalleryItem",
        entityId: item.id,
        reason: "Staff added an item to the gallery",
        after: { mediaAssetId, caption: item.caption, category: savedCategory, assetType: asset.assetType },
      })
      return item
    })
    revalidateTag("gallery", "seconds")
    revalidatePath("/ops/galleries")
    revalidatePath("/gallery")
    return { ok: true, message: "Added to gallery.", id: row.id, category: savedCategory }
  } catch (error) {
    if (isUniqueConflict(error)) return { ok: false, message: "This asset is already in the gallery." }
    return { ok: false, message: "The gallery item could not be saved." }
  }
}

export async function removeGalleryItemAction(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid item ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot manage the gallery." }
  }
  const prisma = getPrisma()
  try {
    const item = await prisma.galleryItem.findUnique({ where: { id }, include: { mediaAsset: true } })
    if (!item) return { ok: false, message: "Gallery item not found." }
    await prisma.$transaction(async (tx) => {
      await tx.galleryItem.delete({ where: { id } })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.GALLERY_ITEM_DELETED,
        entityType: "GalleryItem",
        entityId: id,
        reason: "Staff removed a gallery item",
        after: { mediaAssetId: item.mediaAssetId },
      })
    })
    revalidateTag("gallery", "seconds")
    revalidatePath("/ops/galleries")
    revalidatePath("/gallery")
    return { ok: true, message: "Removed from gallery." }
  } catch {
    return { ok: false, message: "The gallery item could not be removed." }
  }
}

export async function updateGalleryCaptionAction(id: string, caption: string): Promise<{ ok: boolean; message: string }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid item ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot edit gallery captions." }
  }
  const sanitized = String(caption ?? "").slice(0, 300)
  const prisma = getPrisma()
  try {
    await prisma.galleryItem.update({ where: { id }, data: { caption: sanitized || null } })
    revalidateTag("gallery", "seconds")
    revalidatePath("/ops/galleries")
    revalidatePath("/gallery")
    return { ok: true, message: "Caption saved." }
  } catch {
    return { ok: false, message: "The caption could not be saved." }
  }
}

export async function toggleGalleryItemActiveAction(id: string): Promise<{ ok: boolean; message: string; active?: boolean }> {
  if (!id || typeof id !== "string" || id.length > 64) return { ok: false, message: "Invalid item ID." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot manage the gallery." }
  }
  const prisma = getPrisma()
  try {
    const item = await prisma.galleryItem.findUnique({ where: { id } })
    if (!item) return { ok: false, message: "Item not found." }
    const updated = await prisma.galleryItem.update({ where: { id }, data: { active: !item.active } })
    revalidateTag("gallery", "seconds")
    revalidatePath("/ops/galleries")
    revalidatePath("/gallery")
    return { ok: true, message: updated.active ? "Item is now visible." : "Item hidden from gallery.", active: updated.active }
  } catch {
    return { ok: false, message: "Could not toggle visibility." }
  }
}

export async function reorderGalleryItemsAction(orderedIds: string[]): Promise<{ ok: boolean; message: string }> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return { ok: false, message: "No order provided." }
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, StaffPermission.catalogWrite)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: "This desk role cannot reorder gallery items." }
  }
  const prisma = getPrisma()
  try {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        orderedIds.map((itemId, idx) => tx.galleryItem.update({ where: { id: itemId }, data: { sortOrder: idx } })),
      )
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.GALLERY_ITEMS_REORDERED,
        entityType: "GalleryItem",
        entityId: "all",
        reason: "Staff reordered gallery items",
        after: { order: orderedIds },
      })
    })
    revalidateTag("gallery", "seconds")
    revalidatePath("/ops/galleries")
    revalidatePath("/gallery")
    return { ok: true, message: "Order saved." }
  } catch {
    return { ok: false, message: "The order could not be saved." }
  }
}
