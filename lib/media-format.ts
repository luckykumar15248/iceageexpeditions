/**
 * Browser-safe media limits, gallery categories, and display formatters.
 * Keep Node built-ins out of this module: client components import it.
 */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const VIDEO_MAX_BYTES = 80 * 1024 * 1024
export const IMAGE_MAX_MB = 10
export const VIDEO_MAX_MB = 80

export const GALLERY_CATEGORY_OPTIONS = ["Ladakh", "Spiti", "Zanskar", "On the trail"] as const
export type GalleryCategory = (typeof GALLERY_CATEGORY_OPTIONS)[number]

export function isGalleryCategory(value: string): value is GalleryCategory {
  return (GALLERY_CATEGORY_OPTIONS as readonly string[]).includes(value)
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  const whole = Math.round(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
