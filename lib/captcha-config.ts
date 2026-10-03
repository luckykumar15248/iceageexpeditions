/**
 * Browser-safe reCAPTCHA settings shared by the widget and the server verifier.
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY is inlined at build time; changing it needs a rebuild.
 */
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? ""

/** Form field reCAPTCHA v2 writes its token into. */
export const CAPTCHA_FIELD = "g-recaptcha-response"

export const CAPTCHA_PROMPT = "Tick “I’m not a robot” before sending."
