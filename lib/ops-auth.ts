import { createHash, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPrisma } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/passwords"
import { OPS_COOKIE, OPS_SESSION_MAX_AGE, opsSessionConfigured, readOpsSession, sealOpsSession } from "@/lib/ops-session"
import type { StaffRole } from "@/app/generated/prisma/client"

export type OpsStaff = {
  id: string
  email: string
  name: string
  role: StaffRole
}

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

export function loginThrottled(email: string): boolean {
  const key = email.trim().toLowerCase()
  const now = Date.now()
  const row = attempts.get(key)
  if (!row || row.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  row.count += 1
  return row.count > MAX_ATTEMPTS
}

export function clearLoginThrottle(email: string): void {
  attempts.delete(email.trim().toLowerCase())
}

function sameSecret(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest()
  const b = createHash("sha256").update(right).digest()
  return timingSafeEqual(a, b)
}

async function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/ops",
    maxAge: OPS_SESSION_MAX_AGE,
  }
}

export async function writeOpsCookie(staffId: string): Promise<boolean> {
  const token = await sealOpsSession(staffId)
  if (!token) return false
  const jar = await cookies()
  jar.set(OPS_COOKIE, token, await cookieOptions())
  return true
}

export async function clearOpsCookie(): Promise<void> {
  const jar = await cookies()
  jar.set(OPS_COOKIE, "", { ...(await cookieOptions()), maxAge: 0 })
}

export async function getOpsStaff(): Promise<OpsStaff | null> {
  const jar = await cookies()
  const session = await readOpsSession(jar.get(OPS_COOKIE)?.value)
  if (!session) return null
  try {
    const staff = await getPrisma().staffUser.findUnique({
      where: { id: session.staffId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
    if (!staff?.isActive) return null
    return { id: staff.id, email: staff.email, name: staff.name, role: staff.role }
  } catch {
    return null
  }
}

export async function requireOpsStaff(): Promise<OpsStaff> {
  const staff = await getOpsStaff()
  if (!staff) redirect("/ops/login")
  return staff
}

export async function authenticateStaff(email: string, password: string): Promise<OpsStaff | "unconfigured" | "invalid"> {
  if (!opsSessionConfigured()) return "unconfigured"
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes("@") || password.length === 0) return "invalid"

  const prisma = getPrisma()
  const existing = await prisma.staffUser.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true },
  })
  if (existing) {
    if (!existing.isActive) return "invalid"
    const matches = await verifyPassword(password, existing.passwordHash)
    if (!matches) return "invalid"
    return { id: existing.id, email: existing.email, name: existing.name, role: existing.role }
  }

  const count = await prisma.staffUser.count()
  if (count > 0) return "invalid"
  const bootstrapEmail = process.env.OPS_BOOTSTRAP_EMAIL?.trim().toLowerCase()
  const bootstrapPassword = process.env.OPS_BOOTSTRAP_PASSWORD
  if (!bootstrapEmail || !bootstrapPassword || bootstrapPassword.length < 12) return "unconfigured"
  if (!sameSecret(normalized, bootstrapEmail) || !sameSecret(password, bootstrapPassword)) return "invalid"

  const created = await prisma.staffUser.create({
    data: {
      email: bootstrapEmail,
      name: "Ops admin",
      role: "OPS_ADMIN",
      isActive: true,
      passwordHash: await hashPassword(password),
    },
    select: { id: true, email: true, name: true, role: true },
  })
  return created
}
