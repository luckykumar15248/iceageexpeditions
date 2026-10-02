"use client"

import { useId, useRef, useState, useTransition } from "react"
import { deleteHeroSlideAction, reorderHeroSlidesAction, saveHeroSlideAction, type HeroSlideInput } from "@/app/(ops)/ops/cms-actions"
import { MediaPickerModal } from "@/components/ops/media-picker-modal"
import type { CmsHeroSlide } from "@/lib/hero-slides"
import type { MediaAssetRow } from "@/lib/media-assets"

// ─── Types ────────────────────────────────────────────────────────────────────

function blankSlide(): HeroSlideInput {
  return {
    kicker: "",
    title: "",
    body: "",
    primaryLabel: "Explore expedition",
    primaryHref: "/expeditions",
    secondaryLabel: "View departures",
    secondaryHref: "/expeditions",
    imageUrl: "",
    imageAlt: "",
    videoUrl: "",
    mediaAssetId: "",
    active: true,
    sortOrder: 0,
  }
}

function slideToInput(slide: CmsHeroSlide): HeroSlideInput {
  return {
    id: slide.id,
    kicker: slide.kicker,
    title: slide.title,
    body: slide.body,
    primaryLabel: slide.primaryLabel,
    primaryHref: slide.primaryHref,
    secondaryLabel: slide.secondaryLabel ?? "",
    secondaryHref: slide.secondaryHref ?? "",
    imageUrl: slide.imageUrl,
    imageAlt: slide.imageAlt,
    videoUrl: slide.videoUrl ?? "",
    mediaAssetId: slide.mediaAssetId ?? "",
    active: slide.active,
    sortOrder: slide.sortOrder,
  }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
  id,
  error,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  id: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

function inputClass(error?: string) {
  return `min-h-10 w-full rounded-md border px-3 text-base text-ink ${error ? "border-danger" : "border-line bg-paper"}`
}

function VideoPlayIcon() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-paper/80 shadow">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 translate-x-0.5 fill-ink">
          <polygon points="7,5 20,12 7,19" />
        </svg>
      </div>
    </div>
  )
}

function MediaFields({
  imageValue,
  videoValue,
  imageError,
  onPickImage,
  onPickVideo,
  onClearImage,
  onClearVideo,
}: {
  imageValue: string
  videoValue: string
  imageError?: string
  onPickImage: () => void
  onPickVideo: () => void
  onClearImage: () => void
  onClearVideo: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">
          Background image <span className="font-normal text-muted">(required — poster fallback for video slides)</span>
        </p>
        <div className="flex items-start gap-3">
          {imageValue ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageValue} alt="" className="h-14 w-24 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-14 w-24 shrink-0 rounded border border-dashed border-line bg-canvas" />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPickImage}
              className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ink hover:border-alpine hover:text-alpine"
            >
              Pick from library
            </button>
            {imageValue ? (
              <button type="button" onClick={onClearImage} className="text-sm font-medium text-danger hover:underline">
                Clear
              </button>
            ) : null}
          </div>
        </div>
        {imageError ? <p className="text-xs text-danger">{imageError}</p> : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">
          Background video <span className="font-normal text-muted">(optional — muted autoplay loop)</span>
        </p>
        <div className="flex items-start gap-3">
          {videoValue ? (
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded border border-line bg-[#1a1d1b]">
              <video src={videoValue} preload="metadata" muted playsInline className="h-full w-full object-cover" />
              <VideoPlayIcon />
            </div>
          ) : (
            <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded border border-dashed border-line bg-canvas text-muted">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
                <rect x="2" y="6" width="14" height="12" rx="2" />
                <path d="m16 10 6-3v10l-6-3" />
              </svg>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPickVideo}
              className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ink hover:border-alpine hover:text-alpine"
            >
              Pick video
            </button>
            {videoValue ? (
              <button type="button" onClick={onClearVideo} className="text-sm font-medium text-danger hover:underline">
                Clear video
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Slide editor drawer ──────────────────────────────────────────────────────

function SlideEditor({
  initial,
  assets,
  onClose,
  onSaved,
}: {
  initial: HeroSlideInput
  assets: MediaAssetRow[]
  onClose: () => void
  onSaved: (slide: CmsHeroSlide) => void
}) {
  const [form, setForm] = useState(initial)
  const [savePending, startSave] = useTransition()
  const [msg, setMsg] = useState("")
  const [ok, setOk] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [picker, setPicker] = useState<"image" | "video" | null>(null)
  const bodyId = useId()
  const kickerId = useId()
  const titleId = useId()
  const altId = useId()
  const p1LabelId = useId()
  const p1HrefId = useId()
  const s2LabelId = useId()
  const s2HrefId = useId()

  function patch(partial: Partial<HeroSlideInput>) {
    setForm((f) => ({ ...f, ...partial }))
  }

  function clientValidate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.kicker.trim()) errs.kicker = "Required."
    if (!form.title.trim()) errs.title = "Required."
    if (!form.body.trim()) errs.body = "Required."
    if (!form.primaryLabel.trim()) errs.primaryLabel = "Required."
    if (!form.primaryHref.trim()) errs.primaryHref = "Required."
    if (!form.imageUrl.trim()) errs.imageUrl = "Required — used as poster for video slides."
    if (!form.imageAlt.trim()) errs.imageAlt = "Required."
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function save() {
    if (!clientValidate()) return
    startSave(async () => {
      const result = await saveHeroSlideAction(form)
      setMsg(result.message)
      setOk(result.ok)
      if (result.ok) {
        const saved: CmsHeroSlide = {
          id: result.id ?? form.id ?? "",
          kicker: form.kicker.trim().toUpperCase(),
          title: form.title.trim(),
          body: form.body.trim(),
          primaryLabel: form.primaryLabel.trim(),
          primaryHref: form.primaryHref.trim(),
          secondaryLabel: form.secondaryLabel.trim() || null,
          secondaryHref: form.secondaryHref.trim() || null,
          imageUrl: form.imageUrl.trim(),
          imageAlt: form.imageAlt.trim(),
          videoUrl: form.videoUrl.trim() || null,
          mediaAssetId: form.mediaAssetId.trim() || null,
          active: form.active,
          sortOrder: form.sortOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        onSaved(saved)
        window.setTimeout(onClose, 800)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-[rgba(26,29,27,0.35)]" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Edit hero slide"
        aria-modal="true"
        className="flex h-screen w-full max-w-2xl flex-col overflow-y-auto bg-paper shadow-[−18px_0_50px_rgba(26,29,27,0.12)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-6 py-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            {initial.id ? "Edit slide" : "New slide"}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-base font-medium text-muted hover:text-ink">
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 p-6">
          <Field label="Active" id="slide-active">
            <label className="flex min-h-10 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => patch({ active: e.target.checked })}
                className="h-4 w-4 rounded border-line accent-alpine"
              />
              <span className="text-sm text-ink">Show this slide on the homepage</span>
            </label>
          </Field>

          <Field label="Eyebrow kicker" hint="Short uppercase label shown above the title (e.g. FROZEN RIVERS)" id={kickerId} error={errors.kicker}>
            <input
              id={kickerId}
              type="text"
              maxLength={120}
              value={form.kicker}
              onChange={(e) => patch({ kicker: e.target.value })}
              className={inputClass(errors.kicker)}
              aria-invalid={Boolean(errors.kicker)}
            />
          </Field>

          <Field label="Title" id={titleId} error={errors.title}>
            <input
              id={titleId}
              type="text"
              maxLength={180}
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              className={inputClass(errors.title)}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>

          <Field label="Description" id={bodyId} error={errors.body}>
            <textarea
              id={bodyId}
              rows={3}
              maxLength={2000}
              value={form.body}
              onChange={(e) => patch({ body: e.target.value })}
              className={`${inputClass(errors.body)} py-2`}
              aria-invalid={Boolean(errors.body)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary button label" id={p1LabelId} error={errors.primaryLabel}>
              <input
                id={p1LabelId}
                type="text"
                maxLength={80}
                value={form.primaryLabel}
                onChange={(e) => patch({ primaryLabel: e.target.value })}
                className={inputClass(errors.primaryLabel)}
              />
            </Field>
            <Field label="Primary button link" hint="Start with / or https://" id={p1HrefId} error={errors.primaryHref}>
              <input
                id={p1HrefId}
                type="text"
                maxLength={500}
                value={form.primaryHref}
                onChange={(e) => patch({ primaryHref: e.target.value })}
                className={inputClass(errors.primaryHref)}
              />
            </Field>
            <Field label="Secondary button label" hint="Optional" id={s2LabelId}>
              <input
                id={s2LabelId}
                type="text"
                maxLength={80}
                value={form.secondaryLabel}
                onChange={(e) => patch({ secondaryLabel: e.target.value })}
                className={inputClass()}
              />
            </Field>
            <Field label="Secondary button link" hint="Optional" id={s2HrefId}>
              <input
                id={s2HrefId}
                type="text"
                maxLength={500}
                value={form.secondaryHref}
                onChange={(e) => patch({ secondaryHref: e.target.value })}
                className={inputClass()}
              />
            </Field>
          </div>

          <div>
            <MediaFields
              imageValue={form.imageUrl}
              videoValue={form.videoUrl}
              imageError={errors.imageUrl}
              onPickImage={() => setPicker("image")}
              onPickVideo={() => setPicker("video")}
              onClearImage={() => patch({ imageUrl: "", ...(form.videoUrl ? {} : { mediaAssetId: "" }) })}
              onClearVideo={() => patch({ videoUrl: "", mediaAssetId: "" })}
            />
          </div>

          <Field label="Image alt text" hint="Describes the background image for screen readers" id={altId} error={errors.imageAlt}>
            <input
              id={altId}
              type="text"
              maxLength={240}
              value={form.imageAlt}
              onChange={(e) => patch({ imageAlt: e.target.value })}
              className={inputClass(errors.imageAlt)}
            />
          </Field>

          <Field label="Sort order" hint="Lower number = earlier in the carousel" id="slide-sort">
            <input
              id="slide-sort"
              type="number"
              min={0}
              max={999}
              value={form.sortOrder}
              onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
              className={inputClass()}
            />
          </Field>
        </div>

        <div className="sticky bottom-0 border-t border-line bg-paper px-6 py-4">
          {msg ? (
            <p className={`mb-3 text-sm ${ok ? "text-alpine-deep" : "text-danger"}`}>{msg}</p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-line px-4 text-base font-medium text-ink">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={savePending}
              className="min-h-11 rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60"
            >
              {savePending ? "Saving…" : "Save slide"}
            </button>
          </div>
        </div>
      </div>
      {picker ? (
        <MediaPickerModal
          assets={assets}
          accept={picker === "image" ? "IMAGE" : "VIDEO"}
          title={picker === "image" ? "Choose a poster image" : "Choose a background video"}
          description={
            picker === "image"
              ? "This still is required. It is the poster if the slide also has a video, and the fallback on phones or slow connections."
              : "The video loops muted behind the title. The poster image stays required."
          }
          confirmLabel="Use this asset"
          onClose={() => setPicker(null)}
          onConfirm={(asset) => {
            if (picker === "image") {
              patch({
                imageUrl: asset.url,
                imageAlt: form.imageAlt || asset.altText || "",
                ...(form.videoUrl ? {} : { mediaAssetId: asset.id }),
              })
            } else {
              patch({ videoUrl: asset.url, mediaAssetId: asset.id })
            }
            setPicker(null)
          }}
        />
      ) : null}
    </div>
  )
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export function HeroSlidesManager({
  initialSlides,
  mediaAssets,
  canWrite,
}: {
  initialSlides: CmsHeroSlide[]
  mediaAssets: MediaAssetRow[]
  canWrite: boolean
}) {
  const [slides, setSlides] = useState<CmsHeroSlide[]>(initialSlides)
  const [editing, setEditing] = useState<HeroSlideInput | null>(null)
  const [reorderPending, startReorder] = useTransition()
  const [deletePending, startDelete] = useTransition()
  const [msg, setMsg] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  function flashMsg(text: string) {
    setMsg(text)
    window.setTimeout(() => setMsg(""), 4000)
  }

  function openNew() {
    setEditing({ ...blankSlide(), sortOrder: slides.length })
  }

  function openEdit(slide: CmsHeroSlide) {
    setEditing(slideToInput(slide))
  }

  function onSaved(saved: CmsHeroSlide) {
    setSlides((current) => {
      const idx = current.findIndex((s) => s.id === saved.id)
      if (idx >= 0) {
        const next = [...current]
        next[idx] = saved
        return next
      }
      return [...current, saved]
    })
  }

  function handleDelete(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return }
    setDeleteConfirm(null)
    startDelete(async () => {
      const result = await deleteHeroSlideAction(id)
      if (result.ok) {
        setSlides((current) => current.filter((s) => s.id !== id))
      }
      flashMsg(result.message)
    })
  }

  function handleDragStart(index: number) { dragItem.current = index }
  function handleDragEnter(index: number) { dragOver.current = index }

  function handleDragEnd() {
    const from = dragItem.current
    const to = dragOver.current
    if (from === null || to === null || from === to) return
    dragItem.current = null
    dragOver.current = null
    const next = [...slides]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setSlides(next)
    const orderedIds = next.map((s) => s.id)
    startReorder(async () => {
      const result = await reorderHeroSlidesAction(orderedIds)
      flashMsg(result.message)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      {canWrite ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Drag rows to reorder. Changes save automatically.</p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex min-h-10 items-center rounded-md bg-alpine px-4 text-base font-medium text-white hover:bg-alpine-deep"
          >
            + Add slide
          </button>
        </div>
      ) : null}

      {msg ? (
        <p className="rounded-xl border border-line bg-alpine-soft px-4 py-2 text-sm text-alpine-deep">{msg}</p>
      ) : null}

      {slides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-base text-muted">No slides yet. Add the first one to replace the auto-built hero.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_4px_16px_rgba(26,29,27,0.06)]">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">Order</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">Slide</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">Media</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">Primary CTA</th>
                {canWrite ? <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {slides.map((slide, index) => (
                <tr
                  key={slide.id}
                  draggable={canWrite}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`${canWrite ? "cursor-grab hover:bg-alpine-soft/40" : ""} ${reorderPending ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3 text-muted">
                    <span title="Drag to reorder" aria-hidden="true">⠿</span> {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Preview thumbnail */}
                      {slide.imageUrl ? (
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={slide.imageUrl} alt={slide.imageAlt} className="h-full w-full object-cover" />
                          {slide.videoUrl ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(26,29,27,0.5)]">
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-white">
                                <polygon points="7,5 20,12 7,19" />
                              </svg>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="h-10 w-16 rounded border border-dashed border-line bg-canvas" />
                      )}
                      <div>
                        <p className="font-medium text-ink">{slide.title}</p>
                        <p className="text-xs text-muted">{slide.kicker}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      slide.videoUrl ? "bg-[#1a1d1b] text-white" : "bg-canvas text-muted ring-1 ring-line"
                    }`}>
                      {slide.videoUrl ? "Video" : "Image"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      slide.active ? "bg-alpine-soft text-alpine-deep" : "bg-canvas text-muted ring-1 ring-line"
                    }`}>
                      {slide.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{slide.primaryLabel}</p>
                    <p className="max-w-[16rem] truncate text-xs text-muted">{slide.primaryHref}</p>
                  </td>
                  {canWrite ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(slide)}
                          className="text-sm font-medium text-alpine-deep hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(slide.id)}
                          disabled={deletePending}
                          className="text-sm font-medium text-danger hover:underline disabled:opacity-50"
                        >
                          {deleteConfirm === slide.id ? "Confirm" : "Delete"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <SlideEditor
          initial={editing}
          assets={mediaAssets}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  )
}
