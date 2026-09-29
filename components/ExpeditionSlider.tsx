"use client"

import { ExpeditionImage } from "@/components/expedition-image"
import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react"

export type ExpeditionSlideBadge = {
  label: string
}

export type ExpeditionSlide = {
  id: string
  title: string
  href: string
  cta: string
  imageUrl: string
  imageAlt: string
  eyebrow?: string
  badges: ExpeditionSlideBadge[]
  note?: string
}

type ExpeditionSliderProps = {
  slides: ExpeditionSlide[]
  label: string
  autoPlay?: boolean
  intervalMs?: number
}

export function ExpeditionSlider({ slides, label, autoPlay = false, intervalMs = 6000 }: ExpeditionSliderProps) {
  const labelId = useId()
  const scroller = useRef<HTMLDivElement>(null)
  const drag = useRef({ x: 0, active: false })
  const [index, setIndex] = useState(0)
  const [perView, setPerView] = useState(1)
  const [paused, setPaused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  const pageCount = Math.max(1, slides.length - perView + 1)
  const safeIndex = Math.min(index, pageCount - 1)

  useEffect(() => {
    const queries = [
      window.matchMedia("(min-width: 1024px)"),
      window.matchMedia("(min-width: 768px)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ]
    const apply = () => {
      setPerView(queries[0].matches ? 3 : queries[1].matches ? 2 : 1)
      setReduceMotion(queries[2].matches)
    }
    apply()
    for (const query of queries) query.addEventListener("change", apply)
    return () => {
      for (const query of queries) query.removeEventListener("change", apply)
    }
  }, [])

  const go = useCallback(
    (next: number) => {
      setIndex((current) => {
        const pages = Math.max(1, slides.length - perView + 1)
        const bounded = Math.min(current, pages - 1)
        return (bounded + next + pages) % pages
      })
    },
    [perView, slides.length],
  )

  useEffect(() => {
    if (!autoPlay || paused || reduceMotion || pageCount < 2) return
    const timer = window.setInterval(() => go(1), intervalMs)
    return () => window.clearInterval(timer)
  }, [autoPlay, go, intervalMs, pageCount, paused, reduceMotion])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    drag.current = { x: event.clientX, active: true }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    const delta = event.clientX - drag.current.x
    drag.current.active = false
    if (delta > 48) go(-1)
    if (delta < -48) go(1)
  }

  if (slides.length === 0) return null

  const shift = slides.length === 0 ? 0 : (safeIndex * 100) / slides.length

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      <h2 id={labelId} className="sr-only">
        {label}
      </h2>
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          data-slider-control="true"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-paper text-lg font-semibold text-ink shadow-sm hover:border-alpine hover:text-alpine"
          aria-label="Previous slide"
          onClick={() => go(-1)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          data-slider-control="true"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-paper text-lg font-semibold text-ink shadow-sm hover:border-alpine hover:text-alpine"
          aria-label="Next slide"
          onClick={() => go(1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div
        ref={scroller}
        className="overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current.active = false
        }}
      >
        <ul
          className="flex transition-transform duration-500 ease-out"
          style={{
            width: `${(slides.length / perView) * 100}%`,
            transform: `translateX(-${shift}%)`,
          }}
        >
          {slides.map((slide, slideIndex) => {
            const visible = slideIndex >= safeIndex && slideIndex < safeIndex + perView
            return (
              <li
                key={slide.id}
                aria-hidden={visible ? undefined : true}
                className="min-w-0 px-2"
                style={{ width: `${100 / slides.length}%` }}
              >
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_48px_rgba(14,122,70,0.16)]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-line">
                    <ExpeditionImage
                      src={slide.imageUrl}
                      alt={slide.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-7">
                    {slide.eyebrow ? (
                      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">{slide.eyebrow}</p>
                    ) : null}
                    <h3 className="font-display text-3xl font-bold leading-tight text-ink">{slide.title}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {slide.badges.map((badge) => (
                        <li key={badge.label} className="rounded-full bg-alpine-soft px-3 py-1.5 text-sm font-semibold text-alpine-deep">
                          {badge.label}
                        </li>
                      ))}
                    </ul>
                    {slide.note ? <p className="text-lg leading-relaxed text-muted">{slide.note}</p> : null}
                    <Link
                      href={slide.href}
                      tabIndex={visible ? undefined : -1}
                      className="mt-auto inline-flex min-h-14 items-center self-start rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep"
                    >
                      {slide.cta}
                    </Link>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-4 flex justify-center gap-2" role="group" aria-label={`${label} pages`}>
        {Array.from({ length: pageCount }, (_, page) => (
          <button
            key={page}
            type="button"
            data-slider-control="true"
            aria-label={`Show slide group ${page + 1} of ${pageCount}`}
            aria-current={page === safeIndex ? "true" : undefined}
            className="inline-flex min-h-11 min-w-11 items-center justify-center"
            onClick={() => setIndex(page)}
          >
            <span className={`block h-2.5 w-2.5 rounded-full ${page === safeIndex ? "bg-alpine" : "bg-line"}`} />
            <span className="sr-only">{`Slide group ${page + 1}`}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
