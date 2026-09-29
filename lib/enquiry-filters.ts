import { isDeskStatus, type DeskStatus } from "@/lib/enquiry-labels"

const DAY = /^\d{4}-\d{2}-\d{2}$/

export type EnquiryFilters = {
  q: string
  status?: DeskStatus
  expeditionId?: string
  vehicle?: "SUV_4X4" | "MOTORBIKE"
  from?: string
  to?: string
  page: number
  lead?: string
}

export type DeskNote = {
  id: string
  body: string
  authorName: string
  atLabel: string
}

export type DeskLead = {
  id: string
  name: string
  email: string
  phone: string
  kind: string
  kindLabel: string
  status: string
  statusLabel: string
  vehicleLabel: string
  routeTitle: string
  partyLabel: string
  travelLabel: string
  submittedLabel: string
  message: string
  notes: DeskNote[]
  legacyNote: string | null
}

export function parseEnquiryFilters(input: URLSearchParams | Record<string, string | string[] | undefined>): EnquiryFilters {
  const read = (key: string) => {
    const value = input instanceof URLSearchParams ? input.get(key) : input[key]
    const text = Array.isArray(value) ? value[0] : value
    return typeof text === "string" ? text.trim() : ""
  }
  const status = read("status")
  const vehicle = read("vehicle")
  const from = read("from")
  const to = read("to")
  const expeditionId = read("expedition")
  const lead = read("lead")
  const page = Number(read("page"))
  return {
    q: read("q").slice(0, 80),
    status: isDeskStatus(status) ? status : undefined,
    expeditionId: /^[a-z0-9]{8,40}$/i.test(expeditionId) ? expeditionId : undefined,
    vehicle: vehicle === "SUV_4X4" || vehicle === "MOTORBIKE" ? vehicle : undefined,
    from: DAY.test(from) ? from : undefined,
    to: DAY.test(to) ? to : undefined,
    page: Number.isInteger(page) && page > 0 && page < 10000 ? page : 1,
    lead: /^[a-z0-9]{8,40}$/i.test(lead) ? lead : undefined,
  }
}

export function enquiryQuery(filters: EnquiryFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.status) params.set("status", filters.status)
  if (filters.expeditionId) params.set("expedition", filters.expeditionId)
  if (filters.vehicle) params.set("vehicle", filters.vehicle)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.page > 1) params.set("page", String(filters.page))
  if (filters.lead) params.set("lead", filters.lead)
  const query = params.toString()
  return query ? `?${query}` : ""
}
