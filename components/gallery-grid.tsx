"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { PublicGalleryItem } from "@/lib/galleries"
import { formatDuration } from "@/lib/media-format"

function PlayBadge() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(26,29,27,0.4)] transition-colors group-hover:bg-[rgba(26,29,27,0.25)] group-focus-visible:bg-[rgba(26,29,27,0.25)]">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-paper/90 shadow-lg">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 translate-x-0.5 fill-ink">
          <polygon points="7,5 20,12 7,19" />
        </svg>
      </div>
    </div>
  )
}

function Lightbox({ item, onClose }: { item: PublicGalleryItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.assetType === "VIDEO" ? "Video player" : "Image preview"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,29,27,0.92)] p-4"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-paper/20 text-white hover:bg-paper/40 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex w-full max-w-5xl max-h-[92vh] flex-col items-center gap-4" onClick={(event) => event.stopPropagation()}>
        {item.assetType === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl}
            alt={item.altText ?? item.caption ?? "Expedition gallery image"}
            className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <video
            src={item.mediaUrl}
            controls
            autoPlay
            className="max-h-[80vh] w-full rounded-xl shadow-2xl"
            aria-label={item.altText ?? item.caption ?? "Expedition video"}
          />
        )}

        {item.caption ? <p className="max-w-2xl text-center text-sm text-white/80">{item.caption}</p> : null}
      </div>
    </div>
  )
}

type Filter = "all" | "IMAGE" | "VIDEO" | string

export function GalleryGrid({ items }: { items: PublicGalleryItem[] }) {
  const [lightbox, setLightbox] = useState<PublicGalleryItem | null>(null)
  const [filter, setFilter] = useState<Filter>("all")

  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const item of items) {
      if (item.category) names.add(item.category)
    }
    return [...names].sort()
  }, [items])

  const visible = useMemo(() => {
    if (filter === "all") return items
    if (filter === "IMAGE" || filter === "VIDEO") return items.filter((item) => item.assetType === filter)
    return items.filter((item) => item.category === filter)
  }, [filter, items])

  if (items.length === 0) return null

  const tabClass = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium ${
      active ? "bg-alpine text-white" : "border border-line text-ink hover:border-alpine hover:text-alpine"
    }`

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        <button type="button" className={tabClass(filter === "all")} onClick={() => setFilter("all")}>
          All
        </button>
        <button type="button" className={tabClass(filter === "IMAGE")} onClick={() => setFilter("IMAGE")}>
          Photos
        </button>
        <button type="button" className={tabClass(filter === "VIDEO")} onClick={() => setFilter("VIDEO")}>
          Videos
        </button>
        {categories.map((name) => (
          <button key={name} type="button" className={tabClass(filter === name)} onClick={() => setFilter(name)}>
            {name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-base text-muted">No items in this filter.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const isVideo = item.assetType === "VIDEO"
            const duration = formatDuration(item.durationSeconds)
            const ariaLabel = isVideo
              ? `Play video${item.caption ? `: ${item.caption}` : ""}`
              : `View image${item.caption ? `: ${item.caption}` : ""}`

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightbox(item)}
                className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine"
                aria-label={ariaLabel}
              >
                {isVideo ? (
                  <>
                    <video src={item.mediaUrl} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                    <PlayBadge />
                    {duration ? (
                      <span className="absolute top-2 right-2 rounded bg-[rgba(26,29,27,0.8)] px-1.5 py-0.5 text-xs font-medium text-white">
                        {duration}
                      </span>
                    ) : null}
                    {item.caption ? (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(26,29,27,0.75)] px-4 py-3">
                        <p className="line-clamp-2 text-left text-sm font-medium text-white">{item.caption}</p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.mediaUrl}
                      alt={item.altText ?? item.caption ?? "Expedition photograph"}
                      className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                      loading="lazy"
                    />
                    {item.caption ? (
                      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-[rgba(26,29,27,0.75)] px-4 py-3 transition-transform duration-300 motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0">
                        <p className="line-clamp-2 text-left text-sm font-medium text-white">{item.caption}</p>
                      </div>
                    ) : null}
                  </>
                )}
              </button>
            )
          })}
        </div>
      )}

      {lightbox ? <Lightbox item={lightbox} onClose={() => setLightbox(null)} /> : null}
    </>
  )
}