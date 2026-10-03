"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"
import { CAPTCHA_FIELD, RECAPTCHA_SITE_KEY } from "@/lib/captcha-config"

type RenderParams = {
  sitekey: string
  theme: "light"
  size: "normal" | "compact"
  callback: (token: string) => void
  "expired-callback": () => void
  "error-callback": () => void
}

type ReCaptchaApi = {
  ready: (callback: () => void) => void
  render: (container: HTMLElement, params: RenderParams) => number
  reset: (widgetId?: number) => void
}

declare global {
  interface Window {
    grecaptcha?: ReCaptchaApi
  }
}

const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit"
/** Width of the standard checkbox widget; narrower containers get the compact layout. */
const NORMAL_WIDGET_PX = 304

export const captchaEnabled = RECAPTCHA_SITE_KEY !== ""

/** True when the form already carries a token, or when no site key is configured. */
export function captchaSatisfied(form: HTMLFormElement): boolean {
  if (!captchaEnabled) return true
  const token = new FormData(form).get(CAPTCHA_FIELD)
  return typeof token === "string" && token.length > 0
}

export function scrollToCaptcha(form: HTMLFormElement) {
  form.querySelector("[data-captcha]")?.scrollIntoView({ block: "center" })
}

/**
 * reCAPTCHA v2 checkbox. Renders inside the parent <form>, so Google's hidden
 * `g-recaptcha-response` field is submitted with the form data.
 *
 * `resetSignal` should change after every server response (pass the action state);
 * tokens are single-use, so the widget resets for the next attempt.
 */
export function Captcha({ resetSignal, error }: { resetSignal: unknown; error?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<number | null>(null)
  const signalRef = useRef(resetSignal)
  const [solved, setSolved] = useState<{ signal: unknown } | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")

  useEffect(() => {
    signalRef.current = resetSignal
    if (widgetRef.current !== null) window.grecaptcha?.reset(widgetRef.current)
  }, [resetSignal])

  if (!captchaEnabled) return null

  function renderWidget() {
    const api = window.grecaptcha
    const container = containerRef.current
    if (!api || !container) return
    api.ready(() => {
      if (widgetRef.current === null && container.childElementCount === 0) {
        widgetRef.current = api.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: "light",
          size: container.clientWidth < NORMAL_WIDGET_PX ? "compact" : "normal",
          callback: () => setSolved({ signal: signalRef.current }),
          "expired-callback": () => setSolved(null),
          "error-callback": () => setSolved(null),
        })
      }
      setStatus("ready")
    })
  }

  const isSolved = solved !== null && solved.signal === resetSignal
  const visibleError = isSolved ? undefined : error

  return (
    <div className="grid gap-2" data-captcha>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={renderWidget} onError={() => setStatus("failed")} />
      <div ref={containerRef} className="min-h-[78px] w-full" aria-describedby={visibleError ? "captcha-error" : undefined} />
      {status === "loading" ? (
        <p className="text-sm text-muted" aria-live="polite">
          Loading security check…
        </p>
      ) : null}
      {status === "failed" ? (
        <p className="text-base text-danger" role="alert">
          The security check could not load. Check your connection or pause content blockers, then reload the page.
        </p>
      ) : null}
      {visibleError ? (
        <p id="captcha-error" className="text-base text-danger" role="alert">
          {visibleError}
        </p>
      ) : null}
    </div>
  )
}
