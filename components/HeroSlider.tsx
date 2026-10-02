"use client"

import { ExpeditionImage } from "@/components/expedition-image"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
const NARROW_SCREEN = "(max-width: 640px)"

type NetworkInformation = EventTarget & { saveData?: boolean; effectiveType?: string }

function networkInfo(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function reducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION).matches
}

function subscribeVideoConditions(onChange: () => void) {
  const motion = window.matchMedia(REDUCED_MOTION)
  const narrow = window.matchMedia(NARROW_SCREEN)
  const network = networkInfo()
  motion.addEventListener("change", onChange)
  narrow.addEventListener("change", onChange)
  network?.addEventListener("change", onChange)
  return () => {
    motion.removeEventListener("change", onChange)
    narrow.removeEventListener("change", onChange)
    network?.removeEventListener("change", onChange)
  }
}

/** Phones, reduced motion, Save-Data, and 2G get the poster still instead of a background video. */
function videoAllowedSnapshot() {
  if (window.matchMedia(REDUCED_MOTION).matches || window.matchMedia(NARROW_SCREEN).matches) return false
  const network = networkInfo()
  if (network?.saveData) return false
  return network?.effectiveType !== "2g" && network?.effectiveType !== "slow-2g"
}

export type HeroSlide = {
  id: string
  kicker: string
  title: string
  body: string
  image: string
  alt: string
  exploreHref: string
  departuresHref: string
  /** Optional override for the primary button label. Defaults to "Explore expedition". */
  exploreLabel?: string
  /** Optional override for the secondary button label. Defaults to "View departures". */
  departuresLabel?: string
  /** Optional background video URL. When set, renders a muted autoplay loop; image is used as poster. */
  videoUrl?: string
}

type HeroSliderProps = {
  slides: HeroSlide[]
  search?: ReactNode
  intervalMs?: number
}

export function HeroSlider({ slides, search, intervalMs = 7000 }: HeroSliderProps) {
  const labelId = useId()
  const drag = useRef({ x: 0, active: false })
  const [index, setIndex] = useState(0)
  const [pausedHover, setPausedHover] = useState(false)
  const [pausedFocus, setPausedFocus] = useState(false)
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false)
  const allowVideo = useSyncExternalStore(subscribeVideoConditions, videoAllowedSnapshot, () => false)
  const [failedVideoIds, setFailedVideoIds] = useState<ReadonlySet<string>>(new Set())
  const [announcement, setAnnouncement] = useState("")

  const count = slides.length
  const safeIndex = count === 0 ? 0 : index % count
  const slide = slides[safeIndex]

  const go = useCallback(
    (step: number, announce: boolean) => {
      if (count < 2) return
      setIndex((current) => {
        const next = (current + step + count) % count
        if (announce) setAnnouncement(slides[next]?.title ?? "")
        return next
      })
    },
    [count, slides],
  )

  useEffect(() => {
    if (pausedHover || pausedFocus || reduceMotion || count < 2) return
    const timer = window.setInterval(() => go(1, false), intervalMs)
    return () => window.clearInterval(timer)
  }, [count, go, intervalMs, pausedFocus, pausedHover, reduceMotion])

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest("a, button, select, input, textarea, label")) return
    drag.current = { x: event.clientX, active: true }
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (!drag.current.active) return
    const delta = event.clientX - drag.current.x
    drag.current.active = false
    if (delta <= -48) go(1, true)
    else if (delta >= 48) go(-1, true)
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setPausedFocus(false)
  }

  if (!slide) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      className="relative overflow-hidden bg-canvas text-ink"
      onMouseEnter={() => setPausedHover(true)}
      onMouseLeave={() => setPausedHover(false)}
      onFocusCapture={() => setPausedFocus(true)}
      onBlurCapture={onBlur}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current.active = false
      }}
    >
      <div className="relative h-[58vh] min-h-[22rem] overflow-hidden bg-canvas">
        {slides.map((item, itemIndex) => {
          const active = itemIndex === safeIndex
          const hasVideo = Boolean(item.videoUrl) && allowVideo && !failedVideoIds.has(item.id)
          return (
            <div
              key={item.id}
              className={`absolute inset-0 motion-safe:transition-opacity motion-safe:duration-700 ${active ? "opacity-100" : "opacity-0"}`}
              aria-hidden={active ? undefined : true}
              inert={active ? undefined : true}
            >
              {hasVideo && active ? (
                <video
                  aria-hidden="true"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={item.image}
                  className="h-full w-full object-cover"
                  onError={() => setFailedVideoIds((current) => new Set([...current, item.id]))}
                >
                  <source src={item.videoUrl} />
                </video>
              ) : (
                <ExpeditionImage
                  src={item.image}
                  alt={item.alt}
                  fill
                  preload={itemIndex === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              )}
            </div>
          )
        })}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-canvas to-transparent" />
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => go(-1, true)}
          className="absolute top-1/2 left-6 z-20 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-ink shadow-md hover:border-alpine hover:text-alpine md:grid"
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => go(1, true)}
          className="absolute top-1/2 right-6 z-20 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-ink shadow-md hover:border-alpine hover:text-alpine md:grid"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="relative z-10 mx-auto -mt-20 w-full max-w-7xl px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="rounded-3xl border border-line bg-paper px-6 py-8 shadow-[0_18px_50px_rgba(26,29,27,0.08)] sm:px-10 sm:py-12">
          <p className="text-sm font-semibold tracking-wide text-alpine uppercase">The Era of Trails</p>
          <p className="mt-4 text-base font-semibold tracking-[0.12em] text-muted uppercase">{slide.kicker}</p>
          <h1 id={labelId} className="mt-3 max-w-4xl font-display text-4xl leading-tight font-bold tracking-tight text-ink sm:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">{slide.body}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={slide.exploreHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep"
            >
              {slide.exploreLabel ?? "Explore expedition"}
            </Link>
            {slide.departuresHref ? (
              <Link
                href={slide.departuresHref}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-5 text-base font-medium text-ink hover:border-alpine hover:text-alpine"
              >
                {slide.departuresLabel ?? "View departures"}
              </Link>
            ) : null}
          </div>

          <div className="mt-8 flex items-center gap-1" role="group" aria-label="Hero slides">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(-1, true)}
              className="grid h-12 w-12 place-items-center rounded-full border border-line bg-paper text-ink md:hidden"
            >
              <Chevron direction="left" />
            </button>
            {slides.map((item, itemIndex) => {
              const active = itemIndex === safeIndex
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show ${item.title}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    setIndex(itemIndex)
                    setAnnouncement(item.title)
                  }}
                  className="grid h-12 w-12 place-items-center"
                >
                  <span className={`block h-3 rounded-full ${active ? "w-10 bg-alpine" : "w-3 bg-line"}`} />
                </button>
              )
            })}
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(1, true)}
              className="grid h-12 w-12 place-items-center rounded-full border border-line bg-paper text-ink md:hidden"
            >
              <Chevron direction="right" />
            </button>
          </div>

          {search ? <div className="mt-8 max-w-5xl">{search}</div> : null}
        </div>
      </div>
    </section>
  )
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-2">
      {direction === "left" ? <path d="M14.5 5.5 8 12l6.5 6.5" /> : <path d="M9.5 5.5 16 12l-6.5 6.5" />}
    </svg>
  )
}
