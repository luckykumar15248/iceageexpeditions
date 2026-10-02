"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { formatBytes, formatDuration } from "@/lib/media-format"
import type { MediaAssetRow } from "@/lib/media-assets"
import { MediaThumb } from "@/components/ops/media-thumb"

export type MediaPickerAccept = "all" | "IMAGE" | "VIDEO"

type MediaPickerModalProps = {
  assets: MediaAssetRow[]
  accept?: MediaPickerAccept
  /** Library ids already used (e.g. in the gallery) — shown disabled to prevent duplicates. */
  excludeIds?: ReadonlySet<string>
  title: string
  description?: string
  confirmLabel?: string
  pending?: boolean
  error?: string
  onConfirm: (asset: MediaAssetRow) => void
  onClose: () => void
  children?: React.ReactNode
}

export function MediaPickerModal({
  assets,
  accept = "all",
  excludeIds,
  title,
  description,
  confirmLabel = "Use this asset",
  pending = false,
  error,
  onConfirm,
  onClose,
  children,
}: MediaPickerModalProps) {
  const headingId = useId()
  const [filter, setFilter] = useState<MediaPickerAccept>(accept)
  const [selected, setSelected] = useState<MediaAssetRow | null>(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const visible = useMemo(() => {
    const typeFilter = accept === "all" ? filter : accept
    return assets.filter((asset) => {
      if (typeFilter !== "all" && asset.assetType !== typeFilter) return false
      return true
    })
  }, [accept, assets, filter])

  const tabClass = (active: boolean) =>
    `min-h-9 rounded-md px-4 text-sm font-medium ${active ? "bg-alpine text-white" : "border border-line text-ink hover:border-alpine hover:text-alpine"}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,29,27,0.5)] sm:items-center"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-paper shadow-[0_-20px_60px_rgba(26,29,27,0.15)] sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id={headingId} className="font-display text-xl font-bold tracking-tight text-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close media picker"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted hover:border-alpine hover:text-alpine"
          >
            ×
          </button>
        </div>

        {accept === "all" ? (
          <div className="flex flex-wrap gap-2 border-b border-line px-6 py-3">
            <button type="button" className={tabClass(filter === "all")} onClick={() => setFilter("all")}>
              All
            </button>
            <button type="button" className={tabClass(filter === "IMAGE")} onClick={() => setFilter("IMAGE")}>
              Images
            </button>
            <button type="button" className={tabClass(filter === "VIDEO")} onClick={() => setFilter("VIDEO")}>
              Videos
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-6">
          {visible.length === 0 ? (
            <p className="text-sm text-muted">No matching assets. Upload files in the media library first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((asset) => {
                const excluded = excludeIds?.has(asset.id) ?? false
                const isSelected = selected?.id === asset.id
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={excluded}
                    onClick={() => setSelected(isSelected ? null : asset)}
                    className={`group relative aspect-video overflow-hidden rounded-xl border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine ${
                      isSelected ? "border-alpine" : "border-transparent"
                    } ${excluded ? "cursor-not-allowed opacity-40" : "hover:border-alpine/60"}`}
                    title={excluded ? "Already in use" : (asset.altText ?? asset.originalName)}
                  >
                    <MediaThumb
                      url={asset.url}
                      alt={asset.altText ?? asset.originalName}
                      assetType={asset.assetType}
                      durationSeconds={asset.durationSeconds}
                    />
                    {isSelected ? (
                      <div className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-alpine text-white shadow">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-white stroke-2">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </div>
                    ) : null}
                    {excluded ? (
                      <div className="absolute inset-0 flex items-end bg-[rgba(26,29,27,0.4)] p-2">
                        <span className="text-xs font-medium text-white">Already added</span>
                      </div>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(26,29,27,0.75)] p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <p className="truncate text-xs text-white">{asset.originalName}</p>
                      <p className="text-xs text-white/80">{formatBytes(asset.sizeBytes)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-line bg-canvas px-6 py-4">
          {selected ? (
            <div className="flex flex-col gap-3">
              {children}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {selected.originalName}
                  {selected.assetType === "VIDEO" && formatDuration(selected.durationSeconds)
                    ? ` · ${formatDuration(selected.durationSeconds)}`
                    : null}
                </p>
                <button
                  type="button"
                  onClick={() => onConfirm(selected)}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60"
                >
                  {pending ? "Saving…" : confirmLabel}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Select an image or video from the library. Do not re-upload the same file.</p>
          )}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}