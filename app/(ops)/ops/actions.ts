"use server"

import { redirect } from "next/navigation"
import { authenticateStaff, clearLoginThrottle, clearOpsCookie, loginThrottled, writeOpsCookie } from "@/lib/ops-auth"

export type OpsLoginState = { message: string }

export async function signInOps(_previous: OpsLoginState, formData: FormData): Promise<OpsLoginState> {
  const email = read(formData, "email")
  const password = read(formData, "password")
  if (loginThrottled(email)) return { message: "Too many attempts. Wait and try again." }

  try {
    const result = await authenticateStaff(email, password)
    if (result === "unconfigured") return { message: "Staff sign-in is not configured on this server yet." }
    if (result === "invalid") return { message: "Those credentials were not accepted." }
    const saved = await writeOpsCookie(result.id)
    if (!saved) return { message: "Staff sign-in is not configured on this server yet." }
    clearLoginThrottle(email)
  } catch {
    return { message: "The desk could not be reached. Try again in a moment." }
  }

  redirect("/ops")
}

export async function signOutOps(): Promise<void> {
  await clearOpsCookie()
  redirect("/ops/login")
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}
