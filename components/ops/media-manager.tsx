"use client"

import { useRef, useState, useTransition } from "react"
import {
  deleteMediaAction,
  updateMediaAltAction,
  updateMediaDurationAction,
  uploadMediaAction,
} from "@/app/(ops)/ops/cms-actions"
import { IMAGE_MAX_BYTES, IMAGE_MAX_MB, VIDEO_MAX_BYTES, VIDEO_MAX_MB, formatBytes, formatDuration } from "@/lib/media-format"
import type { MediaAssetRow } from "@/lib/media-assets"

const ACCEPTED = ".jpg,.jpeg,.png,.webp,.mp4,.webm"

function VideoBadge() {
  return (
    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-semibold text-ink shadow-sm">
      Video
    </span>
  )
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement("video")
    el.preload = "metadata"
    el.onloadedmetadata = () => {
      const seconds = Number.isFinite(el.duration) ? Math.round(el.duration) : null
      URL.revokeObjectURL(el.src)
      resolve(seconds && seconds > 0 ? seconds : null)
    }
    el.onerror = () => {
      URL.revokeObjectURL(el.src)
      resolve(null)
    }
    el.src = URL.createObjectURL(file)
  })
}

function AssetCard({
  asset,
  canWrite,
  onDeleted,
}: {
  asset: MediaAssetRow
  canWrite: boolean
  onDeleted: (id: string) => void
}) {
  const [altDraft, setAltDraft] = useState(asset.altText ?? "")
  const [altPending, startAlt] = useTransition()
  const [deletePending, startDelete] = useTransition()
  const [copied, setCopied] = useState(false)
  const [altMsg, setAltMsg] = useState("")
  const [deleteMsg, setDeleteMsg] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [playing, setPlaying] = useState(false)
  const isVideo = asset.assetType === "VIDEO"
  const durationLabel = formatDuration(asset.durationSeconds)

  function copyUrl() {
    void navigator.clipboard.writeText(asset.url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  function saveAlt() {
    startAlt(async () => {
      const result = await updateMediaAltAction(asset.id, altDraft)
      setAltMsg(result.message)
      window.setTimeout(() => setAltMsg(""), 3000)
    })
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    startDelete(async () => {
      const result = await deleteMediaAction(asset.id)
      if (result.ok) onDeleted(asset.id)
      else {
        setDeleteMsg(result.message)
        window.setTimeout(() => setDeleteMsg(""), 5000)
      }
    })
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_4px_16px_rgba(26,29,27,0.06)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#1a1d1b]">
        {isVideo ? (
          <>
            <video
              src={asset.url}
              preload="metadata"
              muted
              playsInline
              loop
              autoPlay={playing}
              controls={playing}
              className="h-full w-full object-cover"
              aria-label={asset.altText ?? asset.originalName}
            />
            {!playing ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-[rgba(26,29,27,0.4)]"
                aria-label={`Play ${asset.originalName}`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-paper/90 shadow-md">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 translate-x-0.5 fill-ink">
                    <polygon points="7,5 20,12 7,19" />
                  </svg>
                </span>
              </button>
            ) : null}
            <VideoBadge />
            {durationLabel ? (
              <span className="absolute right-2 bottom-2 rounded bg-[rgba(26,29,27,0.8)] px-1.5 py-0.5 text-xs font-medium text-white">
                {durationLabel}
              </span>
            ) : null}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.altText ?? asset.originalName} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="truncate text-sm font-medium text-ink" title={asset.originalName}>
          {asset.originalName}
        </p>
        <p className="text-xs text-muted">
          {asset.mimeType} · {formatBytes(asset.sizeBytes)}
          {durationLabel ? ` · ${durationLabel}` : ""} · {asset.uploaderName}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ink hover:border-alpine hover:text-alpine"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          {canWrite ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-danger hover:underline disabled:opacity-50"
            >
              {confirming ? "Confirm delete" : deletePending ? "Deleting…" : "Delete"}
            </button>
          ) : null}
        </div>

        {deleteMsg ? <p className="text-sm text-danger">{deleteMsg}</p> : null}

        {canWrite ? (
          <div className="flex gap-2">
            <input
              type="text"
              aria-label={isVideo ? "Video description" : "Alt text"}
              placeholder={isVideo ? "Video description / caption" : "Alt text for accessibility"}
              maxLength={240}
              value={altDraft}
              onChange={(event) => setAltDraft(event.target.value)}
              className="min-h-11 flex-1 rounded-md border border-line bg-paper px-3 text-sm text-ink"
            />
            <button
              type="button"
              onClick={saveAlt}
              disabled={altPending}
              className="inline-flex min-h-11 items-center rounded-md bg-alpine px-3 text-sm font-medium text-white hover:bg-alpine-deep disabled:opacity-50"
            >
              {altPending ? "Saving…" : "Save"}
            </button>
          </div>
        ) : asset.altText ? (
          <p className="text-xs text-muted">{asset.altText}</p>
        ) : null}

        {altMsg ? <p className="text-xs text-alpine-deep">{altMsg}</p> : null}
      </div>
    </article>
  )
}

type FilterType = "all" | "IMAGE" | "VIDEO"

export function MediaManager({ initialAssets, canWrite }: { initialAssets: MediaAssetRow[]; canWrite: boolean }) {
  const [assets, setAssets] = useState(initialAssets)
  const [filter, setFilter] = useState<FilterType>("all")
  const [uploadPending, startUpload] = useTransition()
  const [uploadMsg, setUploadMsg] = useState("")
  const [uploadOk, setUploadOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = filter === "all" ? assets : assets.filter((asset) => asset.assetType === filter)
  const imageCount = assets.filter((asset) => asset.assetType === "IMAGE").length
  const videoCount = assets.filter((asset) => asset.assetType === "VIDEO").length

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|m4v)$/i.test(file.name)
    if (isVideo && file.size > VIDEO_MAX_BYTES) {
      setUploadOk(false)
      setUploadMsg(`Videos must be under ${VIDEO_MAX_MB} MB. Compress before upload.`)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    if (!isVideo && file.size > IMAGE_MAX_BYTES) {
      setUploadOk(false)
      setUploadMsg(`Images must be under ${IMAGE_MAX_MB} MB.`)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    const form = new FormData()
    form.set("file", file)
    setUploadMsg("")
    startUpload(async () => {
      const result = await uploadMediaAction(form)
      if (result.ok) {
        let durationSeconds = result.durationSeconds
        if (result.assetType === "VIDEO" && durationSeconds == null) {
          durationSeconds = await readVideoDuration(file)
          if (durationSeconds) {
            await updateMediaDurationAction(result.id, durationSeconds)
          }
        }
        setUploadOk(true)
        setUploadMsg(`Uploaded: ${result.originalName}`)
        setAssets((current) => [
          {
            id: result.id,
            assetType: result.assetType,
            filename: result.filename,
            originalName: result.originalName,
            url: result.url,
            mimeType: result.mimeType,
            sizeBytes: result.sizeBytes,
            durationSeconds,
            altText: null,
            uploadedByStaffId: "",
            uploaderName: "You",
            createdAt: new Date(),
          },
          ...current,
        ])
      } else {
        setUploadOk(false)
        setUploadMsg(result.message)
      }
      if (inputRef.current) inputRef.current.value = ""
      window.setTimeout(() => setUploadMsg(""), 5000)
    })
  }

  const filterBtnClass = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium ${
      active ? "bg-alpine text-white" : "border border-line text-ink hover:border-alpine hover:text-alpine"
    }`

  return (
    <div className="mt-8 space-y-8">
      {canWrite ? (
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-[0_4px_16px_rgba(26,29,27,0.06)]">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Upload media</h2>
          <p className="mt-1 text-sm text-muted">
            Images (JPEG, PNG, WebP · up to {IMAGE_MAX_MB} MB) or expedition videos (MP4, WebM · up to {VIDEO_MAX_MB} MB).
            Hero slides and the public gallery pick from this library — do not re-upload the same file.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line px-6 py-10 text-center hover:border-alpine">
            <span className="text-base font-medium text-ink">{uploadPending ? "Uploading…" : "Click to choose a file"}</span>
            <span className="text-sm text-muted">JPEG · PNG · WebP · MP4 · WebM</span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              disabled={uploadPending}
              onChange={handleFileChange}
            />
          </label>
          {uploadMsg ? <p className={`mt-3 text-sm ${uploadOk ? "text-alpine-deep" : "text-danger"}`}>{uploadMsg}</p> : null}
        </div>
      ) : null}

      {assets.length === 0 ? (
        <p className="text-base text-muted">No media assets uploaded yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={filterBtnClass(filter === "all")} onClick={() => setFilter("all")}>
              All ({assets.length})
            </button>
            <button type="button" className={filterBtnClass(filter === "IMAGE")} onClick={() => setFilter("IMAGE")}>
              Images ({imageCount})
            </button>
            <button type="button" className={filterBtnClass(filter === "VIDEO")} onClick={() => setFilter("VIDEO")}>
              Videos ({videoCount})
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No {filter.toLowerCase()} assets yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  canWrite={canWrite}
                  onDeleted={(id) => setAssets((current) => current.filter((row) => row.id !== id))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}