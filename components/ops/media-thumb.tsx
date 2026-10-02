"use client"

import { formatDuration } from "@/lib/media-format"

function PlayMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} translate-x-0.5 fill-ink`}>
      <polygon points="7,5 20,12 7,19" />
    </svg>
  )
}

export function MediaThumb({
  url,
  alt,
  assetType,
  durationSeconds,
  className = "h-full w-full object-cover",
}: {
  url: string
  alt: string
  assetType: "IMAGE" | "VIDEO"
  durationSeconds?: number | null
  className?: string
}) {
  const duration = formatDuration(durationSeconds)

  if (assetType === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={className} loading="lazy" />
  }

  return (
    <div className="relative h-full w-full bg-[#1a1d1b]">
      <video src={url} preload="metadata" muted playsInline className={className} aria-label={alt} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(26,29,27,0.35)]">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-paper/90 shadow-md">
          <PlayMark />
        </div>
      </div>
      {duration ? (
        <span className="absolute right-2 bottom-2 rounded bg-[rgba(26,29,27,0.8)] px-1.5 py-0.5 text-xs font-medium text-white">
          {duration}
        </span>
      ) : (
        <span className="absolute top-2 left-2 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-semibold text-ink">
          Video
        </span>
      )}
    </div>
  )
}