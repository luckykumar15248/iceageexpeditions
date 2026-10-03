import type { DepartureStatus, Difficulty, VehicleClass } from "@/app/generated/prisma/client"

export function vehicleLabel(vehicle: VehicleClass): string {
  return vehicle === "SUV_4X4" ? "4x4 SUV" : "Motorbike"
}

export function inventoryNoun(vehicle: VehicleClass, count: number): string {
  if (vehicle === "SUV_4X4") return count === 1 ? "SUV seat" : "SUV seats"
  return count === 1 ? "bike slot" : "bike slots"
}

export function difficultyLabel(difficulty: Difficulty): string {
  switch (difficulty) {
    case "MODERATE":
      return "Moderate"
    case "CHALLENGING":
      return "Challenging"
    case "STRENUOUS":
      return "Strenuous"
    case "EXTREME":
      return "Extreme"
  }
}

export function departureStatusLabel(status: DepartureStatus): string {
  switch (status) {
    case "OPEN":
      return "Open"
    case "FULL":
      return "Full"
    case "CLOSED":
      return "Closed"
    case "CANCELLED":
      return "Cancelled"
    case "COMPLETED":
      return "Completed"
    case "DRAFT":
      return "Draft"
  }
}

export function formatInr(paisa: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paisa / 100)
}

export function formatDepartureDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value)
}

/** Date and time in India Standard Time, for ops audit-style displays. */
export function formatIstDateTime(value: Date): string {
  return `${new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value)} IST`
}

export function formatMovingHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${label} h`
}

export function textLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0)
}

export function metaDescription(value: string, max = 155): string {
  const compact = value.replace(/\s+/g, " ").trim()
  if (compact.length <= max) return compact
  const cut = compact.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
