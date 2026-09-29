const COOKIE = "iae_ops"
const MAX_AGE_SECONDS = 60 * 60 * 12

export const OPS_COOKIE = COOKIE
export const OPS_SESSION_MAX_AGE = MAX_AGE_SECONDS

type SessionPayload = { sub: string; exp: number }

function secret(): string | null {
  const value = process.env.OPS_SESSION_SECRET?.trim()
  if (!value || value.length < 32) return null
  return value
}

export function opsSessionConfigured(): boolean {
  return secret() !== null
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
  } catch {
    return null
  }
}

async function hmacKey(purpose: "sign" | "verify"): Promise<CryptoKey | null> {
  const value = secret()
  if (!value) return null
  return crypto.subtle.importKey("raw", new TextEncoder().encode(value), { name: "HMAC", hash: "SHA-256" }, false, [purpose])
}

export async function sealOpsSession(staffId: string, now = Date.now()): Promise<string | null> {
  const key = await hmacKey("sign")
  if (!key) return null
  const payload: SessionPayload = { sub: staffId, exp: Math.floor(now / 1000) + MAX_AGE_SECONDS }
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))
  return `${body}.${bytesToBase64Url(signature)}`
}

export async function readOpsSession(token: string | undefined, now = Date.now()): Promise<{ staffId: string } | null> {
  if (!token) return null
  const [body, signature] = token.split(".")
  if (!body || !signature || token.split(".").length !== 2) return null
  const key = await hmacKey("verify")
  const signatureBytes = base64UrlToBytes(signature)
  if (!key || !signatureBytes) return null
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as BufferSource,
    new TextEncoder().encode(body),
  )
  if (!valid) return null
  const payloadBytes = base64UrlToBytes(body)
  if (!payloadBytes) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SessionPayload>
    if (typeof payload.sub !== "string" || payload.sub.length < 8) return null
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null
    const nowSeconds = Math.floor(now / 1000)
    if (payload.exp < nowSeconds) return null
    if (payload.exp > nowSeconds + MAX_AGE_SECONDS + 60) return null
    return { staffId: payload.sub }
  } catch {
    return null
  }
}
