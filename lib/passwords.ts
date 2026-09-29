import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = (await scryptAsync(password, salt, 32)) as Buffer
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false
  const [scheme, saltB64, hashB64] = stored.split("$")
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, "base64url")
  const salt = Buffer.from(saltB64, "base64url")
  if (expected.length === 0 || salt.length === 0) return false
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
