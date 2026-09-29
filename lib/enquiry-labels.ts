export const ENQUIRY_STATUSES = ["OPEN", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED"] as const

export type DeskStatus = (typeof ENQUIRY_STATUSES)[number]

export const STATUS_LABEL: Record<DeskStatus, string> = {
  OPEN: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  CONVERTED: "Confirmed",
  CLOSED: "Closed",
}

export const KIND_LABEL: Record<string, string> = {
  GENERAL: "General",
  WAITLIST: "Waitlist",
  CUSTOM_PRIVATE: "Custom group",
  BOOKING_REQUEST: "Booking request",
}

const BADGE: Record<DeskStatus, string> = {
  OPEN: "bg-alpine-soft text-alpine-deep",
  CONTACTED: "border border-line bg-canvas text-ink",
  QUOTED: "border border-alpine bg-paper text-alpine-deep",
  CONVERTED: "bg-alpine text-white",
  CLOSED: "border border-line bg-canvas text-muted",
}

export function statusBadgeClass(status: string): string {
  const tone = status in BADGE ? BADGE[status as DeskStatus] : "border border-line bg-canvas text-ink"
  return `inline-flex items-center rounded-full px-3 py-1 text-base font-semibold ${tone}`
}

export function deskMessage(message: string, includeFitness: boolean): string {
  if (includeFitness) return message.trim()
  return message
    .split(/\n{2,}/)
    .filter((part) => !part.trim().toLowerCase().startsWith("fitness self-declaration:"))
    .join("\n\n")
    .trim()
}

export function isDeskStatus(value: string): value is DeskStatus {
  return (ENQUIRY_STATUSES as readonly string[]).includes(value)
}
