"use client"

import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { saveExpeditionWizard, uploadOpsImage } from "@/app/(ops)/ops/cms-actions"
import { formatInr } from "@/lib/format"
import { getSiteUrl, siteName } from "@/lib/site"
import {
  WIZARD_STEPS,
  errorsForStep,
  firstInvalidStep,
  normalizeDraft,
  slugifyTitle,
  stepOfField,
  validateDraft,
  type DraftDay,
  type DraftDeparture,
  type DraftListItem,
  type ExpeditionDraft,
  type FieldErrors,
} from "@/lib/expedition-draft"

type SavedDeparture = {
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

type EditorExpedition = {
  id: string
  title: string
  slug: string
  regionName: string
  vehicleClass: string
  durationDays: number
  maxAltitudeMeters: number
  difficulty: string
  seasonLabel: string
  summary: string
  inclusions: string
  exclusions: string
  permitNotes: string
  supportVehicleIncluded: boolean
  heroImageUrl: string
  heroImageAlt: string
  status: string
  metaTitle: string
  metaDescription: string
  focusKeywords: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  ogImageAlt: string
  days: { dayNumber: number; title: string; body: string; sleepStop: string; sleepAltitudeMeters: number; movingHours: number }[]
  gallery: { url: string; alt: string }[]
  departures: SavedDeparture[]
}

const fieldClass = "min-h-11 w-full rounded-md border border-line bg-paper px-4 text-base font-normal text-ink"
const cardClass = "rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-8"

export function ExpeditionEditor({ expedition }: { expedition: EditorExpedition | null }) {
  const router = useRouter()
  const initialId = useRef(expedition?.id)
  const slugTouched = useRef(Boolean(expedition?.slug))
  const suppressPersist = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const skipFocus = useRef(true)
  const [draft, setDraft] = useState<ExpeditionDraft>(() => toDraft(expedition))
  const [saved, setSaved] = useState<SavedDeparture[]>(expedition?.departures ?? [])
  const [step, setStep] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState("")
  const [bannerOk, setBannerOk] = useState(false)
  const [restored, setRestored] = useState(false)
  const [stash, setStash] = useState<{ draft: ExpeditionDraft; step: number } | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [pending, setPending] = useState(false)
  const [published, setPublished] = useState(expedition?.status === "PUBLISHED")
  const [statusLabel, setStatusLabel] = useState(
    expedition?.status === "PUBLISHED" ? "Published" : expedition?.status === "ARCHIVED" ? "Archived" : "Draft",
  )
  const [confirming, setConfirming] = useState<null | "publish" | "unpublish">(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(initialId.current))
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isStoredDraft(parsed)) {
          const restoredDraft = normalizeDraft(parsed.draft)
          if (!initialId.current) {
            setDraft(restoredDraft)
            setStep(Math.min(WIZARD_STEPS.length - 1, parsed.step))
            slugTouched.current = restoredDraft.slug.trim().length > 0
            setRestored(true)
          } else if (!restoredDraft.id || restoredDraft.id === initialId.current) {
            setStash({ draft: { ...restoredDraft, id: initialId.current }, step: parsed.step })
          }
        }
      }
    } catch {
      sessionStorage.removeItem(storageKey(initialId.current))
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || suppressPersist.current) return
    sessionStorage.setItem(storageKey(draft.id ?? initialId.current), JSON.stringify({ draft, step }))
  }, [draft, step, hydrated])

  useEffect(() => {
    if (skipFocus.current) {
      skipFocus.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  function clearKeys(keys: string[]) {
    setFieldErrors((current) => {
      const next = { ...current }
      for (const key of keys) delete next[key]
      return next
    })
  }

  function updateTitle(value: string) {
    setDraft((current) => ({
      ...current,
      title: value,
      slug: slugTouched.current ? current.slug : slugifyTitle(value),
    }))
    clearKeys(slugTouched.current ? ["title"] : ["title", "slug"])
  }

  function goNext() {
    const slice = errorsForStep(validateDraft(draft, "draft"), step)
    if (Object.keys(slice).length > 0) {
      setFieldErrors((current) => ({ ...dropStep(current, step), ...slice }))
      setBannerOk(false)
      setBanner("Some fields need attention. Everything you entered is still on this page.")
      revealInvalid()
      return
    }
    setFieldErrors((current) => dropStep(current, step))
    setBanner("")
    setStep((current) => Math.min(WIZARD_STEPS.length - 1, current + 1))
  }

  function goTo(target: number) {
    if (target === step) return
    if (target < step) {
      setStep(target)
      return
    }
    const errors = validateDraft(draft, "draft")
    for (let index = step; index < target; index += 1) {
      const slice = errorsForStep(errors, index)
      if (Object.keys(slice).length > 0) {
        setFieldErrors((current) => ({ ...current, ...slice }))
        setStep(index)
        setBannerOk(false)
        setBanner("Some fields need attention. Everything you entered is still on this page.")
      revealInvalid()
        return
      }
    }
    setStep(target)
  }

  function requestSave() {
    const intent = published ? "publish" : "draft"
    const errors = validateDraft(draft, intent)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setStep(firstInvalidStep(errors))
      setBannerOk(false)
      setBanner("Some fields need attention. Everything you entered is still on this page.")
      revealInvalid()
      return
    }
    void persist(intent)
  }

  function requestPublish() {
    const errors = validateDraft(draft, "publish")
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setStep(firstInvalidStep(errors))
      setBannerOk(false)
      setBanner("Some fields need attention. Everything you entered is still on this page.")
      revealInvalid()
      return
    }
    setConfirming("publish")
  }

  async function persist(intent: "draft" | "publish") {
    setPending(true)
    setConfirming(null)
    try {
      const result = await saveExpeditionWizard(normalizeDraft(draft), intent)
      setFieldErrors(result.fieldErrors)
      if (!result.ok) {
        setBannerOk(false)
        setBanner(result.message)
        if (Object.keys(result.fieldErrors).length > 0) {
          setStep(firstInvalidStep(result.fieldErrors))
          revealInvalid()
        }
        if (result.id || result.created.length > 0) {
          setDraft((current) => ({
            ...current,
            id: result.id ?? current.id,
            departures: current.departures.filter((row) => !result.created.some((item) => item.key === row.key)),
          }))
          if (result.created.length > 0) setSaved((current) => [...current, ...result.created])
        }
        return
      }
      setDraft((current) => ({
        ...current,
        id: result.id,
        departures: current.departures.filter((row) => !result.created.some((item) => item.key === row.key)),
      }))
      if (result.created.length > 0) setSaved((current) => [...current, ...result.created])
      setPublished(intent === "publish")
      setStatusLabel(intent === "publish" ? "Published" : "Draft")
      setBannerOk(true)
      setBanner(result.message)
      setRestored(false)
      if (!initialId.current && result.id) {
        suppressPersist.current = true
        sessionStorage.removeItem(storageKey(undefined))
        sessionStorage.removeItem(storageKey(result.id))
        router.push(`/ops/expeditions/${result.id}?saved=1`)
        return
      }
      router.refresh()
    } catch {
      setBannerOk(false)
      setBanner("The expedition could not be saved. Your entries are still on this page.")
    } finally {
      setPending(false)
    }
  }

  const capacityLabel = draft.vehicleClass === "MOTORBIKE" ? "Motorbike slots" : "SUV seats"
  const stepHasError = (index: number) => Object.keys(fieldErrors).some((key) => stepOfField(key) === index)

  return (
    <form
      className="mt-8"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault()
        if (step < WIZARD_STEPS.length - 1) goNext()
      }}
    >
      <ol className="grid gap-3 sm:grid-cols-4" aria-label="Expedition steps">
        {WIZARD_STEPS.map((item, index) => {
          const current = index === step
          return (
            <li key={item.label}>
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                onClick={() => goTo(index)}
                className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                  current ? "border-alpine bg-alpine-soft" : "border-line bg-paper"
                } ${stepHasError(index) ? "border-danger" : ""}`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-base font-medium ${
                    current || index < step ? "bg-alpine text-white" : "bg-canvas text-ink"
                  }`}
                >
                  {index + 1}
                </span>
                <span>
                  <span className="block text-base font-medium text-ink">{item.label}</span>
                  <span className="block text-base text-muted">{item.hint}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-sm font-semibold tracking-wide text-alpine uppercase">
        Step {step + 1} of {WIZARD_STEPS.length}
        {" · "}
        {statusLabel}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={WIZARD_STEPS.length}
        aria-valuenow={step + 1}
        aria-label={`Step ${step + 1} of ${WIZARD_STEPS.length}`}
      >
        <div className="h-full bg-alpine" style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
      </div>

      {stash ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3">
          <p className="text-base text-ink">Unsaved edits from this browser are available. The saved route is still on this page.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="min-h-12 text-base font-medium text-alpine-deep"
              onClick={() => {
                setDraft(stash.draft)
                setStep(Math.min(WIZARD_STEPS.length - 1, stash.step))
                slugTouched.current = stash.draft.slug.trim().length > 0
                setStash(null)
                setRestored(true)
              }}
            >
              Restore edits
            </button>
            <button
              type="button"
              className="min-h-12 text-base font-medium text-ink"
              onClick={() => {
                sessionStorage.removeItem(storageKey(initialId.current))
                setStash(null)
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {restored ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-alpine-soft px-4 py-3">
          <p className="text-base text-ink">Unsaved entries from this browser were restored.</p>
          <button
            type="button"
            className="min-h-12 text-base font-medium text-alpine-deep"
            onClick={() => {
              setDraft(toDraft(expedition))
              setStep(0)
              setFieldErrors({})
              setRestored(false)
              setBanner("")
              slugTouched.current = Boolean(expedition?.slug)
              sessionStorage.removeItem(storageKey(initialId.current))
            }}
          >
            Discard restored entries
          </button>
        </div>
      ) : null}

      {banner ? (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-base ${bannerOk ? "border-line bg-alpine-soft text-ink" : "border-danger/40 bg-paper text-danger"}`} role={bannerOk ? "status" : "alert"}>
          {banner}
        </p>
      ) : null}

      <div className="mt-6">
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl outline-none">
          {WIZARD_STEPS[step]?.label}
        </h2>
        {step === 0 ? (
          <BasicsStep
            draft={draft}
            errors={fieldErrors}
            pending={pending}
            onTitle={updateTitle}
            onSlug={(value) => {
              slugTouched.current = true
              setDraft((current) => ({ ...current, slug: value }))
              clearKeys(["slug"])
            }}
            onChange={(patch, keys) => {
              setDraft((current) => ({ ...current, ...patch }))
              clearKeys(keys)
            }}
          />
        ) : null}
        {step === 1 ? (
          <ItineraryStep
            draft={draft}
            errors={fieldErrors}
            pending={pending}
            onChange={(patch, keys) => {
              setDraft((current) => ({ ...current, ...patch }))
              clearKeys(keys)
            }}
          />
        ) : null}
        {step === 2 ? (
          <DeparturesStep
            draft={draft}
            saved={saved}
            errors={fieldErrors}
            pending={pending}
            capacityLabel={capacityLabel}
            onChange={(departures, keys) => {
              setDraft((current) => ({ ...current, departures }))
              clearKeys(keys)
            }}
          />
        ) : null}
        {step === 3 ? (
          <SeoStep
            draft={draft}
            errors={fieldErrors}
            pending={pending}
            onChange={(patch, keys) => {
              setDraft((current) => ({ ...current, ...patch }))
              clearKeys(keys)
            }}
          />
        ) : null}
      </div>

      <div className="sticky bottom-0 z-30 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 py-4 backdrop-blur">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 rounded-md border border-line bg-paper px-6 text-base font-medium text-ink disabled:opacity-50"
            disabled={step === 0 || pending}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Previous
          </button>
          {step < WIZARD_STEPS.length - 1 ? (
            <button type="submit" className="min-h-11 rounded-md border border-line bg-paper px-6 text-base font-medium text-ink" disabled={pending}>
              Next
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {published ? (
            <button
              type="button"
              className="min-h-11 rounded-md border border-line bg-paper px-6 text-base font-medium text-ink"
              disabled={pending}
              onClick={() => setConfirming("unpublish")}
            >
              Move to draft
            </button>
          ) : (
            <button
              type="button"
              className="min-h-11 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60"
              disabled={pending}
              onClick={requestPublish}
            >
              Publish
            </button>
          )}
          <button
            type="button"
            className="min-h-11 rounded-md border border-alpine bg-paper px-6 text-base font-medium text-alpine-deep disabled:opacity-60"
            disabled={pending}
            onClick={requestSave}
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Saving…
              </span>
            ) : published ? (
              "Save changes"
            ) : (
              "Save draft"
            )}
          </button>
        </div>
      </div>

      {confirming ? (
        <ConfirmDialog
          title={confirming === "publish" ? "Publish this route?" : "Move this route back to draft?"}
          body={
            confirming === "publish"
              ? "Publishing shows the route on the public site. It does not open a departure or take a payment. A batch stays off the booking page until its own status is Open."
              : "The public route book will hide this expedition. Saved departure batches stay on the desk."
          }
          confirmLabel={confirming === "publish" ? "Publish route" : "Move to draft"}
          pending={pending}
          onCancel={() => setConfirming(null)}
          onConfirm={() => void persist(confirming === "publish" ? "publish" : "draft")}
        />
      ) : null}
    </form>
  )
}

function BasicsStep({
  draft,
  errors,
  pending,
  onTitle,
  onSlug,
  onChange,
}: {
  draft: ExpeditionDraft
  errors: FieldErrors
  pending: boolean
  onTitle: (value: string) => void
  onSlug: (value: string) => void
  onChange: (patch: Partial<ExpeditionDraft>, keys: string[]) => void
}) {
  return (
    <div className={`${cardClass} mt-6 grid gap-5`}>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Title" value={draft.title} error={errors.title} disabled={pending} onChange={onTitle} />
        <TextField
          label="Slug"
          value={draft.slug}
          error={errors.slug}
          hint="Lowercase words, for example winter-spiti."
          disabled={pending}
          onChange={onSlug}
        />
        <TextField
          label="Region"
          value={draft.regionName}
          error={errors.regionName}
          hint="Spiti, Zanskar, Ladakh, or another region name you already use."
          disabled={pending}
          onChange={(value) => onChange({ regionName: value }, ["regionName"])}
        />
        <SelectField
          label="Vehicle class"
          value={draft.vehicleClass}
          disabled={pending}
          onChange={(value) => onChange({ vehicleClass: value === "MOTORBIKE" ? "MOTORBIKE" : "SUV_4X4" }, [])}
        >
          <option value="SUV_4X4">4x4 SUV</option>
          <option value="MOTORBIKE">Motorbike</option>
        </SelectField>
        <TextField
          label="Duration (days)"
          value={draft.durationDays}
          error={errors.durationDays}
          type="number"
          disabled={pending}
          onChange={(value) => onChange({ durationDays: value }, ["durationDays"])}
        />
        <TextField
          label="Max altitude (metres)"
          value={draft.maxAltitudeMeters}
          error={errors.maxAltitudeMeters}
          type="number"
          disabled={pending}
          onChange={(value) => onChange({ maxAltitudeMeters: value }, ["maxAltitudeMeters"])}
        />
        <SelectField
          label="Difficulty"
          value={draft.difficulty}
          disabled={pending}
          onChange={(value) =>
            onChange(
              {
                difficulty:
                  value === "MODERATE" || value === "STRENUOUS" || value === "EXTREME" || value === "CHALLENGING"
                    ? value
                    : "CHALLENGING",
              },
              [],
            )
          }
        >
          <option value="MODERATE">Moderate</option>
          <option value="CHALLENGING">Challenging</option>
          <option value="STRENUOUS">Strenuous</option>
          <option value="EXTREME">Extreme</option>
        </SelectField>
        <TextField
          label="Season"
          value={draft.seasonLabel}
          error={errors.seasonLabel}
          disabled={pending}
          onChange={(value) => onChange({ seasonLabel: value }, ["seasonLabel"])}
        />
      </div>
      <AreaField
        label="Summary"
        value={draft.summary}
        error={errors.summary}
        disabled={pending}
        onChange={(value) => onChange({ summary: value }, ["summary"])}
      />
      <ImageField
        label="Hero image"
        url={draft.heroImageUrl}
        alt={draft.heroImageAlt}
        urlError={errors.heroImageUrl}
        altError={errors.heroImageAlt}
        disabled={pending}
        onUrl={(value) => onChange({ heroImageUrl: value }, ["heroImageUrl"])}
        onAlt={(value) => onChange({ heroImageAlt: value }, ["heroImageAlt"])}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-display text-2xl font-bold text-ink">Gallery</h3>
        <button
          type="button"
          className="min-h-12 rounded-md border border-line px-4 text-base font-medium text-ink"
          disabled={pending}
          onClick={() =>
            onChange({ gallery: [...draft.gallery, { key: rowKey("gallery"), url: "", alt: "" }] }, ["gallery"])
          }
        >
          Add image
        </button>
      </div>
      {errors.gallery ? <FieldError>{errors.gallery}</FieldError> : null}
      {draft.gallery.map((image) => (
        <div key={image.key} className="grid gap-4 rounded-2xl border border-line p-4">
          <ImageField
            label="Gallery image"
            url={image.url}
            alt={image.alt}
            urlError={errors[`gallery.${image.key}.url`]}
            altError={errors[`gallery.${image.key}.alt`]}
            disabled={pending}
            onUrl={(value) =>
              onChange(
                { gallery: draft.gallery.map((item) => (item.key === image.key ? { ...item, url: value } : item)) },
                [`gallery.${image.key}.url`],
              )
            }
            onAlt={(value) =>
              onChange(
                { gallery: draft.gallery.map((item) => (item.key === image.key ? { ...item, alt: value } : item)) },
                [`gallery.${image.key}.alt`],
              )
            }
          />
          <button
            type="button"
            className="justify-self-start text-base font-medium text-danger"
            onClick={() => onChange({ gallery: draft.gallery.filter((item) => item.key !== image.key) }, [`gallery.${image.key}.url`, `gallery.${image.key}.alt`])}
          >
            Remove image
          </button>
        </div>
      ))}
    </div>
  )
}

function ItineraryStep({
  draft,
  errors,
  pending,
  onChange,
}: {
  draft: ExpeditionDraft
  errors: FieldErrors
  pending: boolean
  onChange: (patch: Partial<ExpeditionDraft>, keys: string[]) => void
}) {
  return (
    <div className="mt-6 grid gap-6">
      <section className={`${cardClass} grid gap-5`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-base leading-relaxed text-muted">Each day needs a title, a narrative, a sleep stop, and the hours on the road. Move a day to change its place. Day numbers follow that order. A blank day is left out of the save.</p>
          <button
            type="button"
            className="min-h-12 rounded-md border border-line px-4 text-base font-medium text-ink"
            disabled={pending}
            onClick={() =>
              onChange(
                { days: [...draft.days, blankDay(draft.days.length + 1)] },
                ["days"],
              )
            }
          >
            Add day
          </button>
        </div>
        {errors.days ? <FieldError>{errors.days}</FieldError> : null}
        {draft.days.map((day, index) => (
          <fieldset key={day.key} className="grid gap-4 rounded-2xl border border-line p-5">
            <legend className="px-2 text-base font-medium text-ink">Day {day.dayNumber || "—"}</legend>
            <div className="grid gap-4 md:grid-cols-4">
              <TextField label="Day number" value={day.dayNumber} error={errors[`days.${day.key}.dayNumber`]} type="number" disabled={pending} onChange={(value) => patchDay(draft, day.key, { dayNumber: value }, onChange)} />
              <TextField label="Sleep altitude (m)" value={day.sleepAltitudeMeters} error={errors[`days.${day.key}.sleepAltitudeMeters`]} type="number" disabled={pending} onChange={(value) => patchDay(draft, day.key, { sleepAltitudeMeters: value }, onChange)} />
              <TextField label="Moving hours" value={day.movingHours} error={errors[`days.${day.key}.movingHours`]} hint="Driving or riding hours." type="number" disabled={pending} onChange={(value) => patchDay(draft, day.key, { movingHours: value }, onChange)} />
              <TextField label="Sleep stop" value={day.sleepStop} error={errors[`days.${day.key}.sleepStop`]} hint="Write “Not set” if the halt is not named yet." disabled={pending} onChange={(value) => patchDay(draft, day.key, { sleepStop: value }, onChange)} />
            </div>
            <TextField label="Title" value={day.title} error={errors[`days.${day.key}.title`]} disabled={pending} onChange={(value) => patchDay(draft, day.key, { title: value }, onChange)} />
            <AreaField label="Narrative" value={day.body} error={errors[`days.${day.key}.body`]} disabled={pending} onChange={(value) => patchDay(draft, day.key, { body: value }, onChange)} />
            <div className="flex flex-wrap gap-4">
              <button type="button" className="min-h-12 text-base font-medium text-ink disabled:opacity-40" disabled={pending || index === 0} onClick={() => moveDay(draft, day.key, -1, onChange)}>
                Move up
              </button>
              <button
                type="button"
                className="min-h-12 text-base font-medium text-ink disabled:opacity-40"
                disabled={pending || index === draft.days.length - 1}
                onClick={() => moveDay(draft, day.key, 1, onChange)}
              >
                Move down
              </button>
              <button type="button" className="min-h-12 text-base font-medium text-danger" onClick={() => onChange({ days: draft.days.filter((item) => item.key !== day.key) }, [`days.${day.key}.title`])}>
                Remove day
              </button>
            </div>
          </fieldset>
        ))}
      </section>
      <Checklist
        title="Inclusions"
        items={draft.inclusionItems}
        disabled={pending}
        onChange={(inclusionItems) => onChange({ inclusionItems }, [])}
      />
      <Checklist
        title="Exclusions"
        items={draft.exclusionItems}
        disabled={pending}
        onChange={(exclusionItems) => onChange({ exclusionItems }, [])}
      />
      <section className={`${cardClass} grid gap-5`}>
        <AreaField
          label="Permit notes"
          value={draft.permitNotes}
          error={errors.permitNotes}
          hint="Leave this blank when the permit window is not confirmed."
          disabled={pending}
          onChange={(value) => onChange({ permitNotes: value }, ["permitNotes"])}
        />
        <label className="flex min-h-11 items-center gap-3 text-base text-ink">
          <input
            type="checkbox"
            className="size-5"
            checked={draft.supportVehicleIncluded}
            disabled={pending}
            onChange={(event) => onChange({ supportVehicleIncluded: event.target.checked }, [])}
          />
          Support vehicle is part of this route
        </label>
      </section>
    </div>
  )
}

function DeparturesStep({
  draft,
  saved,
  errors,
  pending,
  capacityLabel,
  onChange,
}: {
  draft: ExpeditionDraft
  saved: SavedDeparture[]
  errors: FieldErrors
  pending: boolean
  capacityLabel: string
  onChange: (departures: DraftDeparture[], keys: string[]) => void
}) {
  return (
    <div className="mt-6 grid gap-6">
      <section className={cardClass}>
        <h3 className="font-display text-2xl font-bold text-ink">Saved batches</h3>
        {saved.length === 0 ? (
          <p className="mt-4 text-base leading-relaxed text-muted">No dated batches are stored yet. New batches below are kept on this page until you save.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-base">
              <thead>
                <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="py-3 pr-4 font-semibold">Dates</th>
                  <th className="py-3 pr-4 font-semibold">Meeting point</th>
                  <th className="py-3 pr-4 font-semibold">Open</th>
                  <th className="py-3 pr-4 font-semibold">Price</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {saved.map((departure) => (
                  <tr key={departure.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 text-ink">{departure.startDate} – {departure.endDate}</td>
                    <td className="py-3 pr-4 text-ink">{departure.meetingPoint}</td>
                    <td className="py-3 pr-4 text-ink">{departure.seatsRemaining} of {departure.capacity}</td>
                    <td className="py-3 pr-4 text-ink">
                      {formatInr(departure.pricePaisa)}
                      <span className="block text-base text-muted">Deposit {formatInr(departure.depositPaisa)}</span>
                    </td>
                    <td className="py-3 text-ink">{departure.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className={`${cardClass} grid gap-5`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-base leading-relaxed text-muted">
            {capacityLabel} for this vehicle class. A new batch starts with every place still open. Saving does not rewrite batches that are already stored.
          </p>
          <button
            type="button"
            className="min-h-12 rounded-md border border-line px-4 text-base font-medium text-ink"
            disabled={pending}
            onClick={() => onChange([...draft.departures, blankDeparture()], [])}
          >
            Add batch
          </button>
        </div>
        {draft.departures.length === 0 ? <p className="text-base leading-relaxed text-muted">No new batches yet.</p> : null}
        {draft.departures.map((row) => (
          <fieldset key={row.key} className="grid gap-4 rounded-2xl border border-line p-5">
            <legend className="px-2 text-base font-medium text-ink">New batch</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Start date" type="date" value={row.startDate} error={errors[`departures.${row.key}.startDate`]} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { startDate: value }, onChange)} />
              <TextField label="End date" type="date" value={row.endDate} error={errors[`departures.${row.key}.endDate`]} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { endDate: value }, onChange)} />
              <TextField label="Meeting point" value={row.meetingPoint} error={errors[`departures.${row.key}.meetingPoint`]} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { meetingPoint: value }, onChange)} />
              <TextField label={capacityLabel} type="number" value={row.capacity} error={errors[`departures.${row.key}.capacity`]} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { capacity: value }, onChange)} />
              <TextField label="Price (INR)" inputMode="decimal" value={row.priceRupees} error={errors[`departures.${row.key}.priceRupees`]} hint="Rupees. The desk stores paise." disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { priceRupees: value }, onChange)} />
              <TextField label="Deposit (INR)" inputMode="decimal" value={row.depositRupees} error={errors[`departures.${row.key}.depositRupees`]} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { depositRupees: value }, onChange)} />
              <SelectField label="Status" value={row.status} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { status: value === "OPEN" ? "OPEN" : "DRAFT" }, onChange)}>
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
              </SelectField>
            </div>
            <AreaField label="Cancellation terms" value={row.policySnapshot} error={errors[`departures.${row.key}.policySnapshot`]} disabled={pending} onChange={(value) => patchDeparture(draft, row.key, { policySnapshot: value }, onChange)} />
            <button type="button" className="justify-self-start text-base font-medium text-danger" onClick={() => onChange(draft.departures.filter((item) => item.key !== row.key), [`departures.${row.key}.startDate`])}>
              Remove batch
            </button>
          </fieldset>
        ))}
      </section>
    </div>
  )
}

function SeoStep({
  draft,
  errors,
  pending,
  onChange,
}: {
  draft: ExpeditionDraft
  errors: FieldErrors
  pending: boolean
  onChange: (patch: Partial<ExpeditionDraft>, keys: string[]) => void
}) {
  const fallbackTitle = draft.title.trim() ? `${draft.title.trim()} · ${draft.durationDays || "—"} days` : "Expedition title"
  const snippetTitle = draft.metaTitle.trim() || fallbackTitle
  const snippetDescription = draft.metaDescription.trim() || draft.summary.trim() || "The public summary appears here when the meta description is empty."
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className={`${cardClass} grid gap-5`}>
        <TextField
          label="Meta title"
          value={draft.metaTitle}
          error={errors.metaTitle}
          hint={`${draft.metaTitle.trim().length} characters. Search results usually show about 60.`}
          disabled={pending}
          onChange={(value) => onChange({ metaTitle: value }, ["metaTitle"])}
        />
        <AreaField
          label="Meta description"
          value={draft.metaDescription}
          error={errors.metaDescription}
          hint={`${draft.metaDescription.trim().length} characters. Search results usually show about 160.`}
          disabled={pending}
          onChange={(value) => onChange({ metaDescription: value }, ["metaDescription"])}
        />
        <TextField
          label="Focus keywords"
          value={draft.focusKeywords}
          error={errors.focusKeywords}
          hint="Comma-separated. They are metadata, not hidden page text."
          disabled={pending}
          onChange={(value) => onChange({ focusKeywords: value }, ["focusKeywords"])}
        />
        <label className="flex min-h-11 items-center gap-3 text-base text-ink">
          <input type="checkbox" className="size-5" checked={draft.robotsIndex} disabled={pending} onChange={(event) => onChange({ robotsIndex: event.target.checked }, [])} />
          Allow search engines to index this route
        </label>
        <label className="flex min-h-11 items-center gap-3 text-base text-ink">
          <input type="checkbox" className="size-5" checked={draft.robotsFollow} disabled={pending} onChange={(event) => onChange({ robotsFollow: event.target.checked }, [])} />
          Allow search engines to follow links on this route
        </label>
        <TextField label="Social title" value={draft.ogTitle} error={errors.ogTitle} disabled={pending} onChange={(value) => onChange({ ogTitle: value }, ["ogTitle"])} />
        <AreaField label="Social description" value={draft.ogDescription} error={errors.ogDescription} disabled={pending} onChange={(value) => onChange({ ogDescription: value }, ["ogDescription"])} />
        <ImageField
          label="Social share image"
          url={draft.ogImageUrl}
          alt={draft.ogImageAlt}
          urlError={errors.ogImageUrl}
          altError={errors.ogImageAlt}
          disabled={pending}
          onUrl={(value) => onChange({ ogImageUrl: value }, ["ogImageUrl"])}
          onAlt={(value) => onChange({ ogImageAlt: value }, ["ogImageAlt"])}
        />
      </section>
      <SearchPreview title={snippetTitle} slug={slugifyTitle(draft.slug || draft.title)} description={snippetDescription} />
    </div>
  )
}

function Checklist({
  title,
  items,
  disabled,
  onChange,
}: {
  title: string
  items: DraftListItem[]
  disabled: boolean
  onChange: (items: DraftListItem[]) => void
}) {
  return (
    <section className={`${cardClass} grid gap-4`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-display text-2xl font-bold text-ink">{title}</h3>
        <button
          type="button"
          className="min-h-12 rounded-md border border-line px-4 text-base font-medium text-ink"
          disabled={disabled}
          onClick={() => onChange([...items, { key: rowKey(title), text: "", included: true }])}
        >
          Add line
        </button>
      </div>
      <p className="text-base leading-relaxed text-muted">Checked lines are saved on the route. An unchecked line stays here until you remove it.</p>
      {items.map((item) => (
        <div key={item.key} className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <label className="flex min-h-11 items-center gap-3 text-base text-ink">
            <input
              type="checkbox"
              className="size-5"
              checked={item.included}
              disabled={disabled}
              aria-label={`Include this ${title.toLowerCase()} line`}
              onChange={(event) => onChange(items.map((row) => (row.key === item.key ? { ...row, included: event.target.checked } : row)))}
            />
            Include
          </label>
          <input
            value={item.text}
            disabled={disabled}
            aria-label={`${title} line`}
            className={fieldClass}
            onChange={(event) => onChange(items.map((row) => (row.key === item.key ? { ...row, text: event.target.value } : row)))}
          />
          <button type="button" className="min-h-11 text-base font-medium text-danger" onClick={() => onChange(items.filter((row) => row.key !== item.key))}>
            Remove
          </button>
        </div>
      ))}
    </section>
  )
}

function SearchPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  const host = getSiteUrl().replace(/^https?:\/\//, "")
  return (
    <aside className={`${cardClass} h-fit lg:sticky lg:top-6`}>
      <h3 className="font-display text-2xl font-bold text-ink">Search preview</h3>
      <p className="mt-2 text-base text-muted">A shortened view of the title and description search results usually show.</p>
      <div className="mt-5 rounded-2xl border border-line bg-canvas p-5">
        <p className="text-base text-ink">{siteName}</p>
        <p className="text-base text-alpine-deep">{host}/expeditions/{slug || "route-slug"}</p>
        <p className="mt-2 font-display text-2xl font-bold text-ink">{clip(title, 60)}</p>
        <p className="mt-2 text-base leading-relaxed text-muted">{clip(description, 160)}</p>
      </div>
    </aside>
  )
}

function ImageField({
  label,
  url,
  alt,
  urlError,
  altError,
  disabled,
  onUrl,
  onAlt,
}: {
  label: string
  url: string
  alt: string
  urlError?: string
  altError?: string
  disabled: boolean
  onUrl: (value: string) => void
  onAlt: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState("")
  const [uploading, setUploading] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setUploadError("")
    setUploading(true)
    try {
      const body = new FormData()
      body.set("file", file)
      const result = await uploadOpsImage(body)
      if (!result.ok) {
        setUploadError(result.message)
        return
      }
      onUrl(result.url)
    } catch {
      setUploadError("The image could not be uploaded. The current image was left in place.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-base font-semibold text-ink">{label}</p>
        <button
          type="button"
          className="min-h-12 rounded-md border border-line px-4 text-base font-medium text-ink disabled:opacity-60"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
      </div>
      {url ? (
        <div className="relative h-44 overflow-hidden rounded-2xl border border-line bg-canvas">
          {/* Ops previews local uploads and https files outside the image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt || `${label} preview`} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <TextField label="Image URL" value={url} error={urlError || uploadError} hint="JPEG, PNG, or WebP up to 4 MB, or a site path." disabled={disabled} onChange={(value) => { setUploadError(""); onUrl(value) }} />
      <TextField label="Alt text" value={alt} error={altError} disabled={disabled} onChange={onAlt} />
    </div>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const cancelOnEscape = useEffectEvent(() => onCancel())
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelOnEscape()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,27,0.35)] px-4" role="presentation" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expedition-confirm-title"
        className="w-full max-w-xl rounded-3xl border border-line bg-paper p-8 shadow-[0_18px_50px_rgba(26,29,27,0.12)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="expedition-confirm-title" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">{body}</p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" className="min-h-11 rounded-md border border-line px-6 text-base font-medium text-ink" onClick={onCancel}>
            Keep editing
          </button>
          <button type="button" className="min-h-11 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60" disabled={pending} onClick={onConfirm}>
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Saving…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  inputMode,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  type?: string
  inputMode?: "decimal"
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`${fieldClass} ${error ? "border-danger" : ""}`}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError id={`${id}-note`}>{error}</FieldError> : hint ? <p id={`${id}-note`} className="text-base font-normal text-muted">{hint}</p> : null}
    </div>
  )
}

function AreaField({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={4}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`${fieldClass} min-h-32 py-3 ${error ? "border-danger" : ""}`}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError id={`${id}-note`}>{error}</FieldError> : hint ? <p id={`${id}-note`} className="text-base font-normal text-muted">{hint}</p> : null}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      <select id={id} value={value} disabled={disabled} className={fieldClass} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  )
}

function FieldError({ children, id }: { children: string; id?: string }) {
  return (
    <p id={id} className="text-base font-normal text-danger">
      {children}
    </p>
  )
}

function patchDay(
  draft: ExpeditionDraft,
  key: string,
  patch: Partial<DraftDay>,
  onChange: (patch: Partial<ExpeditionDraft>, keys: string[]) => void,
) {
  const field = Object.keys(patch)[0]
  onChange(
    { days: draft.days.map((day) => (day.key === key ? { ...day, ...patch } : day)) },
    [`days.${key}.${field ?? "title"}`, "days"],
  )
}

function moveDay(
  draft: ExpeditionDraft,
  key: string,
  direction: -1 | 1,
  onChange: (patch: Partial<ExpeditionDraft>, keys: string[]) => void,
) {
  const index = draft.days.findIndex((day) => day.key === key)
  const target = index + direction
  if (index < 0 || target < 0 || target >= draft.days.length) return
  const days = draft.days.slice()
  const [row] = days.splice(index, 1)
  if (!row) return
  days.splice(target, 0, row)
  onChange(
    { days: days.map((day, position) => ({ ...day, dayNumber: String(position + 1) })) },
    ["days"],
  )
}

function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
}

function patchDeparture(
  draft: ExpeditionDraft,
  key: string,
  patch: Partial<DraftDeparture>,
  onChange: (departures: DraftDeparture[], keys: string[]) => void,
) {
  const field = Object.keys(patch)[0]
  onChange(
    draft.departures.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    [`departures.${key}.${field ?? "startDate"}`],
  )
}

function toDraft(expedition: EditorExpedition | null): ExpeditionDraft {
  if (!expedition) {
    return {
      title: "",
      slug: "",
      regionName: "",
      vehicleClass: "SUV_4X4",
      durationDays: "",
      maxAltitudeMeters: "",
      difficulty: "CHALLENGING",
      seasonLabel: "",
      summary: "",
      inclusionItems: [{ key: "inclusion-0", text: "", included: true }],
      exclusionItems: [{ key: "exclusion-0", text: "", included: true }],
      permitNotes: "",
      supportVehicleIncluded: true,
      heroImageUrl: "",
      heroImageAlt: "",
      metaTitle: "",
      metaDescription: "",
      focusKeywords: "",
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: "",
      ogDescription: "",
      ogImageUrl: "",
      ogImageAlt: "",
      days: [blankDay(1, "day-0")],
      gallery: [],
      departures: [],
    }
  }
  const vehicleClass = expedition.vehicleClass === "MOTORBIKE" ? "MOTORBIKE" : "SUV_4X4"
  const difficulty =
    expedition.difficulty === "MODERATE" || expedition.difficulty === "STRENUOUS" || expedition.difficulty === "EXTREME"
      ? expedition.difficulty
      : "CHALLENGING"
  return {
    id: expedition.id,
    title: expedition.title,
    slug: expedition.slug,
    regionName: expedition.regionName,
    vehicleClass,
    durationDays: String(expedition.durationDays),
    maxAltitudeMeters: String(expedition.maxAltitudeMeters),
    difficulty,
    seasonLabel: expedition.seasonLabel,
    summary: expedition.summary,
    inclusionItems: listFromText(expedition.inclusions, "inclusion"),
    exclusionItems: listFromText(expedition.exclusions, "exclusion"),
    permitNotes: expedition.permitNotes,
    supportVehicleIncluded: expedition.supportVehicleIncluded,
    heroImageUrl: expedition.heroImageUrl,
    heroImageAlt: expedition.heroImageAlt,
    metaTitle: expedition.metaTitle,
    metaDescription: expedition.metaDescription,
    focusKeywords: expedition.focusKeywords,
    robotsIndex: expedition.robotsIndex,
    robotsFollow: expedition.robotsFollow,
    ogTitle: expedition.ogTitle,
    ogDescription: expedition.ogDescription,
    ogImageUrl: expedition.ogImageUrl,
    ogImageAlt: expedition.ogImageAlt,
    days: expedition.days.length
      ? expedition.days.map((day, index) => ({
          key: `day-${index}`,
          dayNumber: String(day.dayNumber),
          title: day.title,
          body: day.body,
          sleepStop: day.sleepStop,
          sleepAltitudeMeters: String(day.sleepAltitudeMeters),
          movingHours: String(day.movingHours),
        }))
      : [blankDay(1, "day-0")],
    gallery: expedition.gallery.map((image, index) => ({ key: `gallery-${index}`, url: image.url, alt: image.alt })),
    departures: [],
  }
}

function listFromText(text: string, prefix: string): DraftListItem[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0)
  if (rows.length === 0) return [{ key: `${prefix}-0`, text: "", included: true }]
  return rows.map((line, index) => ({ key: `${prefix}-${index}`, text: line, included: true }))
}

function blankDay(dayNumber: number, key = rowKey("day")): DraftDay {
  return { key, dayNumber: String(dayNumber), title: "", body: "", sleepStop: "", sleepAltitudeMeters: "", movingHours: "" }
}

function blankDeparture(): DraftDeparture {
  return {
    key: rowKey("departure"),
    startDate: "",
    endDate: "",
    meetingPoint: "",
    capacity: "",
    priceRupees: "",
    depositRupees: "",
    policySnapshot: "",
    status: "DRAFT",
  }
}

function rowKey(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function revealInvalid() {
  window.setTimeout(() => {
    document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()
  }, 0)
}

function storageKey(id: string | undefined): string {
  return `iae-expedition-wizard:${id ?? "new"}`
}

function dropStep(errors: FieldErrors, step: number): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => stepOfField(key) !== step))
}

function clip(value: string, max: number): string {
  const compact = value.replace(/\s+/g, " ").trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, max - 1).trim()}…`
}

function isStoredDraft(value: unknown): value is { draft: ExpeditionDraft; step: number } {
  if (!value || typeof value !== "object") return false
  const record = value as { draft?: { title?: unknown; days?: unknown; inclusionItems?: unknown }; step?: unknown }
  return Boolean(record.draft && typeof record.draft.title === "string" && Array.isArray(record.draft.days) && typeof record.step === "number")
}
