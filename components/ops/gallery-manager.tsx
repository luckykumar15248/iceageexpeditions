"use client"

import { useRef, useState, useTransition } from "react"
import {
  addGalleryItemAction,
  removeGalleryItemAction,
  reorderGalleryItemsAction,
  toggleGalleryItemActiveAction,
  updateGalleryCaptionAction,
} from "@/app/(ops)/ops/cms-actions"
import { MediaPickerModal } from "@/components/ops/media-picker-modal"
import { MediaThumb } from "@/components/ops/media-thumb"
import type { CmsGalleryItem } from "@/lib/galleries"
import { GALLERY_CATEGORY_OPTIONS, formatBytes } from "@/lib/media-format"
import type { MediaAssetRow } from "@/lib/media-assets"

export function GalleryManager({
  initialItems,
  mediaAssets,
  canWrite,
}: {
  initialItems: CmsGalleryItem[]
  mediaAssets: MediaAssetRow[]
  canWrite: boolean
}) {
  const [items, setItems] = useState<CmsGalleryItem[]>(initialItems)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [caption, setCaption] = useState("")
  const [category, setCategory] = useState("")
  const [addPending, startAdd] = useTransition()
  const [reorderPending, startReorder] = useTransition()
  const [addError, setAddError] = useState("")
  const [msg, setMsg] = useState("")
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const existingIds = new Set(items.map((item) => item.mediaAssetId))

  function flashMsg(text: string) {
    setMsg(text)
    window.setTimeout(() => setMsg(""), 4000)
  }

  function onRemoved(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function onToggled(id: string, active: boolean) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, active } : item)))
  }

  function handleDragStart(index: number) {
    dragItem.current = index
  }
  function handleDragEnter(index: number) {
    dragOver.current = index
  }

  function handleDragEnd() {
    const from = dragItem.current
    const to = dragOver.current
    if (from === null || to === null || from === to) return
    dragItem.current = null
    dragOver.current = null
    const next = [...items]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setItems(next)
    const orderedIds = next.map((item) => item.id)
    startReorder(async () => {
      const result = await reorderGalleryItemsAction(orderedIds)
      flashMsg(result.message)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      {canWrite ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Drag rows to reorder. Pick from the media library — each asset can appear once.</p>
          <button
            type="button"
            onClick={() => {
              setCaption("")
              setCategory("")
              setAddError("")
              setPickerOpen(true)
            }}
            className="inline-flex min-h-11 items-center rounded-md bg-alpine px-4 text-base font-medium text-white hover:bg-alpine-deep"
          >
            + Add item
          </button>
        </div>
      ) : null}

      {msg ? <p className="rounded-xl border border-line bg-alpine-soft px-4 py-2 text-sm text-alpine-deep">{msg}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-base text-muted">No gallery items yet. Add images and videos from the media library.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_4px_16px_rgba(26,29,27,0.06)]">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Order</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Preview</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Type</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Asset</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Caption</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Visibility</th>
                {canWrite ? <th className="px-4 py-3 text-xs font-medium tracking-wide text-muted uppercase">Actions</th> : null}
              </tr>
            </thead>
            <tbody className={`divide-y divide-line ${reorderPending ? "opacity-60" : ""}`} aria-label="Gallery items">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  draggable={canWrite}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(event) => event.preventDefault()}
                  className={canWrite ? "cursor-grab hover:bg-alpine-soft/30" : ""}
                >
                  <td className="px-4 py-3 text-muted">
                    <span aria-hidden="true">⠿</span> {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative h-12 w-20 overflow-hidden rounded-lg border border-line bg-[#1a1d1b]">
                      <MediaThumb
                        url={item.mediaUrl}
                        alt={item.altText ?? item.originalName}
                        assetType={item.assetType}
                        durationSeconds={item.durationSeconds}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.assetType === "VIDEO" ? "bg-[#1a1d1b] text-white" : "bg-canvas text-muted ring-1 ring-line"
                      }`}
                    >
                      {item.assetType === "VIDEO" ? "Video" : "Image"}
                    </span>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <p className="truncate text-sm text-ink">{item.originalName}</p>
                    <p className="text-xs text-muted">{formatBytes(item.sizeBytes)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    {canWrite ? (
                      <CaptionCell item={item} />
                    ) : (
                      <p className="max-w-[12rem] truncate text-sm text-muted">{item.caption ?? "—"}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleCell item={item} canWrite={canWrite} onToggled={onToggled} />
                  </td>
                  {canWrite ? (
                    <td className="px-4 py-3">
                      <RemoveCell item={item} onRemoved={onRemoved} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pickerOpen ? (
        <MediaPickerModal
          assets={mediaAssets}
          excludeIds={existingIds}
          title="Add to gallery"
          description="Pick one library asset. Each file can only appear once."
          confirmLabel="Add to gallery"
          pending={addPending}
          error={addError}
          onClose={() => setPickerOpen(false)}
          onConfirm={(asset) => {
            startAdd(async () => {
              setAddError("")
              const result = await addGalleryItemAction(asset.id, caption, category)
              if (!result.ok) {
                setAddError(result.message)
                return
              }
              const saved: CmsGalleryItem = {
                id: result.id ?? `temp-${Date.now()}`,
                caption: caption.trim() || null,
                category: result.category ?? null,
                mediaUrl: asset.url,
                mimeType: asset.mimeType,
                assetType: asset.assetType,
                altText: asset.altText,
                durationSeconds: asset.durationSeconds,
                sortOrder: items.length,
                active: true,
                mediaAssetId: asset.id,
                originalName: asset.originalName,
                sizeBytes: asset.sizeBytes,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              setItems((current) => [...current, saved])
              setPickerOpen(false)
              flashMsg(result.message)
            })
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="gallery-caption">
                Caption <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="gallery-caption"
                type="text"
                maxLength={300}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Short description…"
                className="min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="gallery-category">
                Category <span className="font-normal text-muted">(optional)</span>
              </label>
              <select
                id="gallery-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-ink"
              >
                <option value="">Uncategorized</option>
                {GALLERY_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </MediaPickerModal>
      ) : null}
    </div>
  )
}

function CaptionCell({ item }: { item: CmsGalleryItem }) {
  const [draft, setDraft] = useState(item.caption ?? "")
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState("")
  function save() {
    start(async () => {
      const result = await updateGalleryCaptionAction(item.id, draft)
      setMsg(result.message)
      window.setTimeout(() => setMsg(""), 3000)
    })
  }
  return (
    <div>
      <div className="flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={300}
          placeholder="Caption…"
          className="min-h-11 w-40 rounded-md border border-line bg-paper px-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-alpine px-2 text-sm font-medium text-white hover:bg-alpine-deep disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
      </div>
      {msg ? <p className="mt-1 text-xs text-alpine-deep">{msg}</p> : null}
    </div>
  )
}

function ToggleCell({
  item,
  canWrite,
  onToggled,
}: {
  item: CmsGalleryItem
  canWrite: boolean
  onToggled: (id: string, active: boolean) => void
}) {
  const [active, setActive] = useState(item.active)
  const [pending, start] = useTransition()
  function toggle() {
    start(async () => {
      const result = await toggleGalleryItemActiveAction(item.id)
      if (result.ok && result.active !== undefined) {
        setActive(result.active)
        onToggled(item.id, result.active)
      }
    })
  }
  if (!canWrite) {
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-alpine-soft text-alpine-deep" : "bg-canvas text-muted ring-1 ring-line"}`}>
        {active ? "Visible" : "Hidden"}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold hover:opacity-80 disabled:opacity-50 ${active ? "bg-alpine-soft text-alpine-deep" : "bg-canvas text-muted ring-1 ring-line"}`}
    >
      {pending ? "…" : active ? "Visible" : "Hidden"}
    </button>
  )
}

function RemoveCell({ item, onRemoved }: { item: CmsGalleryItem; onRemoved: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState("")
  function handle() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setConfirm(false)
    start(async () => {
      const result = await removeGalleryItemAction(item.id)
      if (result.ok) onRemoved(item.id)
      else {
        setMsg(result.message)
        window.setTimeout(() => setMsg(""), 5000)
      }
    })
  }
  if (msg) return <p className="text-xs text-danger">{msg}</p>
  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="text-sm font-medium text-danger hover:underline disabled:opacity-50"
    >
      {confirm ? "Confirm" : pending ? "Removing…" : "Remove"}
    </button>
  )
}