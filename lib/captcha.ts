/**
 * Server-side reCAPTCHA v2 verification for public forms.
 *
 * Enabled when RECAPTCHA_SECRET_KEY is set. Without it (local dev) submissions pass and a
 * warning is logged once in production. Never import this from a client component.
 */
import { headers } from "next/headers"
import { z } from "zod"
import { CAPTCHA_FIELD, CAPTCHA_PROMPT, RECAPTCHA_SITE_KEY } from "@/lib/captcha-config"

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
const VERIFY_TIMEOUT_MS = 5000

const tokenSchema = z.string().trim().min(1).max(4096)

const siteVerifySchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
})

export type CaptchaFailure = "missing" | "rejected" | "unavailable" | "misconfigured"

export type CaptchaResult = { ok: true } | { ok: false; reason: CaptchaFailure; message: string }

const MESSAGES: Record<CaptchaFailure, string> = {
  missing: CAPTCHA_PROMPT,
  rejected: "The security check expired or did not pass. Tick the box again, then send.",
  unavailable: "The security check service did not respond. Wait a moment, then send again.",
  misconfigured: "Online requests are paused while the security check is fixed. Try again later.",
}

function fail(reason: CaptchaFailure): CaptchaResult {
  return { ok: false, reason, message: MESSAGES[reason] }
}

let warnedDisabled = false

export async function verifyCaptcha(formData: FormData, form: "enquiry" | "booking"): Promise<CaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim()
  if (!secret) {
    if (process.env.NODE_ENV === "production" && !warnedDisabled) {
      warnedDisabled = true
      console.warn("[captcha] RECAPTCHA_SECRET_KEY is not set; public forms are not bot-protected")
    }
    return { ok: true }
  }
  if (!RECAPTCHA_SITE_KEY) {
    console.error("[captcha] RECAPTCHA_SECRET_KEY is set but NEXT_PUBLIC_RECAPTCHA_SITE_KEY was not set at build time", { form })
    return fail("misconfigured")
  }

  const token = tokenSchema.safeParse(formData.get(CAPTCHA_FIELD))
  if (!token.success) return fail("missing")

  const body = new URLSearchParams({ secret, response: token.data })
  // Nginx sets X-Real-IP from the socket address; X-Forwarded-For can be forged by the client.
  const clientIp = (await headers()).get("x-real-ip")?.trim()
  if (clientIp) body.set("remoteip", clientIp)

  let payload: unknown
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error("[captcha] siteverify HTTP error", { form, status: response.status })
      return fail("unavailable")
    }
    payload = await response.json()
  } catch (error) {
    console.error("[captcha] siteverify request failed", { form, error: error instanceof Error ? error.name : "UNKNOWN" })
    return fail("unavailable")
  }

  const result = siteVerifySchema.safeParse(payload)
  if (!result.success) {
    console.error("[captcha] siteverify returned an unexpected body", { form })
    return fail("unavailable")
  }
  if (result.data.success) return { ok: true }

  const codes = result.data["error-codes"] ?? []
  if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
    console.error("[captcha] secret key rejected by Google", { form, codes })
    return fail("misconfigured")
  }
  return fail("rejected")
}
