import { connection } from "next/server"
import { EnquiryStatus, VehicleClass, type Prisma } from "@/app/generated/prisma/client"
import { getPrisma } from "@/lib/db"
import { deskMessage, KIND_LABEL, STATUS_LABEL, type DeskStatus } from "@/lib/enquiry-labels"
import { type DeskLead, type EnquiryFilters } from "@/lib/enquiry-filters"
import { requireOpsStaff, type OpsStaff } from "@/lib/ops-auth"
import { StaffPermission, staffHasPermission } from "@/lib/staff"

const PAGE_SIZE = 20
const EXPORT_CAP = 2000

export type { DeskLead, EnquiryFilters } from "@/lib/enquiry-filters"
export { enquiryQuery, parseEnquiryFilters } from "@/lib/enquiry-filters"

export type EnquiryDeskData = {
  staff: OpsStaff
  canUpdate: boolean
  rows: DeskLead[]
  total: number
  page: number
  pageSize: number
  openLead: DeskLead | null
  expeditions: { id: string; title: string }[]
} | { staff: OpsStaff; offline: true }

const leadSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  kind: true,
  status: true,
  vehicleClass: true,
  preferredMonth: true,
  partySize: true,
  message: true,
  internalNote: true,
  createdAt: true,
  expedition: { select: { title: true, vehicleClass: true } },
  departure: { select: { startDate: true } },
  notes: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  },
} satisfies Prisma.EnquirySelect

export async function loadEnquiryDesk(filters: EnquiryFilters): Promise<EnquiryDeskData> {
  const staff = await requireOpsStaff()
  const includeFitness = staffHasPermission(staff.role, StaffPermission.medicalRead)
  try {
    await connection()
    const prisma = getPrisma()
    const where = whereFor(filters)
    const [total, rows, expeditions, open] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: leadSelect,
      }),
      prisma.expedition.findMany({
        orderBy: { title: "asc" },
        take: 200,
        select: { id: true, title: true },
      }),
      filters.lead
        ? prisma.enquiry.findUnique({ where: { id: filters.lead }, select: leadSelect })
        : Promise.resolve(null),
    ])
    return {
      staff,
      canUpdate: staffHasPermission(staff.role, StaffPermission.enquiryUpdate),
      rows: rows.map((row) => toLead(row, includeFitness)),
      total,
      page: filters.page,
      pageSize: PAGE_SIZE,
      openLead: open ? toLead(open, includeFitness) : null,
      expeditions,
    }
  } catch {
    return { staff, offline: true }
  }
}

export async function loadEnquiryExport(filters: EnquiryFilters): Promise<DeskLead[] | "offline"> {
  const staff = await requireOpsStaff()
  const includeFitness = staffHasPermission(staff.role, StaffPermission.medicalRead)
  try {
    await connection()
    const rows = await getPrisma().enquiry.findMany({
      where: whereFor(filters),
      orderBy: { createdAt: "desc" },
      take: EXPORT_CAP,
      select: leadSelect,
    })
    return rows.map((row) => toLead(row, includeFitness))
  } catch {
    return "offline"
  }
}

export function enquiriesToCsv(rows: DeskLead[]): string {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Vehicle",
    "Route",
    "Group size",
    "Travel date",
    "Status",
    "Kind",
    "Submitted",
    "Message",
    "Notes",
  ]
  const lines = rows.map((row) =>
    [
      row.name,
      row.email,
      row.phone,
      row.vehicleLabel,
      row.routeTitle,
      row.partyLabel,
      row.travelLabel,
      row.statusLabel,
      row.kindLabel,
      row.submittedLabel,
      row.message,
      noteText(row),
    ]
      .map(csvCell)
      .join(","),
  )
  return `\uFEFF${[header.join(","), ...lines].join("\r\n")}\r\n`
}

function whereFor(filters: EnquiryFilters): Prisma.EnquiryWhereInput {
  const where: Prisma.EnquiryWhereInput = {}
  if (filters.status) where.status = filters.status as EnquiryStatus
  if (filters.expeditionId) where.expeditionId = filters.expeditionId
  if (filters.vehicle) where.vehicleClass = filters.vehicle as VehicleClass
  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (filters.from) createdAt.gte = new Date(`${filters.from}T00:00:00+05:30`)
    if (filters.to) createdAt.lte = new Date(`${filters.to}T23:59:59.999+05:30`)
    where.createdAt = createdAt
  }
  const q = filters.q.trim()
  if (q) {
    const or: Prisma.EnquiryWhereInput[] = [
      { name: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ]
    const digits = q.replace(/\D/g, "")
    if (digits.length >= 3 && digits !== q) or.push({ phone: { contains: digits } })
    where.OR = or
  }
  return where
}

type LeadRow = Prisma.EnquiryGetPayload<{ select: typeof leadSelect }>

function toLead(row: LeadRow, includeFitness: boolean): DeskLead {
  const vehicle = row.vehicleClass ?? row.expedition?.vehicleClass ?? null
  const notes = row.notes.map((note) => ({
    id: note.id,
    body: note.body,
    authorName: note.author.name,
    atLabel: when(note.createdAt),
  }))
  const legacy = row.internalNote?.trim() ?? ""
  const duplicated = legacy.length > 0 && notes.some((note) => note.body.trim() === legacy)
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    kind: row.kind,
    kindLabel: KIND_LABEL[row.kind] ?? row.kind,
    status: row.status,
    statusLabel: STATUS_LABEL[row.status as DeskStatus] ?? row.status,
    vehicleLabel: vehicle === "SUV_4X4" ? "4x4 SUV" : vehicle === "MOTORBIKE" ? "Motorbike" : "Not provided",
    routeTitle: row.expedition?.title ?? "Not linked",
    partyLabel: row.partySize == null ? "Not provided" : String(row.partySize),
    travelLabel: travelLabel(row.departure?.startDate ?? null, row.preferredMonth),
    submittedLabel: when(row.createdAt),
    message: deskMessage(row.message, includeFitness),
    notes,
    legacyNote: duplicated || legacy.length === 0 ? null : legacy,
  }
}

function travelLabel(start: Date | null, preferredMonth: string | null): string {
  if (start) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(start)
  }
  if (preferredMonth && /^\d{4}-\d{2}$/.test(preferredMonth)) {
    const [year, month] = preferredMonth.split("-")
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
    const label = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }).format(date)
    return `Preferred ${label}`
  }
  return "Not provided"
}

function when(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function noteText(row: DeskLead): string {
  const parts = [
    ...row.notes.map((note) => `${note.atLabel} ${note.authorName}: ${note.body}`),
    row.legacyNote ? `Earlier note: ${row.legacyNote}` : "",
  ].filter((part) => part.length > 0)
  return parts.join(" | ")
}

function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`
  return guarded
}
