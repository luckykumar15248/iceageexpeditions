import type { Metadata } from "next"
import { GalleryGrid } from "@/components/gallery-grid"
import { getPublicGallery } from "@/lib/galleries"

export const metadata: Metadata = {
  title: "Gallery · Ice Age Expeditions",
  description:
    "Photographs and expedition footage from Ice Age Expeditions Himalayan journeys — Ladakh, Spiti, Zanskar, and beyond. SUV 4x4 and motorbike routes at high altitude.",
}

export const revalidate = 120

export default async function GalleryPage() {
  const items = await getPublicGallery()
  const gallery = items === "offline" ? [] : items

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      {/* Header */}
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-alpine uppercase">The Era of Trails</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Gallery
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          High-altitude passes, ice-locked rivers, and mountain horizons — captured on Ice Age Expeditions routes
          through Ladakh, Spiti, and Zanskar. Click any image or video to view full size.
        </p>
      </header>

      <div className="mt-12">
        {gallery.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-paper py-20 text-center">
            <p className="text-base font-medium text-muted">Gallery coming soon.</p>
            <p className="mt-2 text-sm text-muted">Photographs and expedition footage will appear here once ops publish them from the media library.</p>
          </div>
        ) : (
          <GalleryGrid items={gallery} />
        )}
      </div>

      {/* Count */}
      {gallery.length > 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          {gallery.length} item{gallery.length === 1 ? "" : "s"} ·{" "}
          {gallery.filter((i) => i.assetType === "VIDEO").length} video
          {gallery.filter((i) => i.assetType === "VIDEO").length === 1 ? "" : "s"} ·{" "}
          {gallery.filter((i) => i.assetType === "IMAGE").length} photo
          {gallery.filter((i) => i.assetType === "IMAGE").length === 1 ? "" : "s"}
        </p>
      ) : null}
    </main>
  )
}
