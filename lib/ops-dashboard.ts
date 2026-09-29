import { connection } from "next/server"
import {
  BookingStatus,
  DepartureStatus,
  EnquiryStatus,
  ExpeditionStatus,
} from "@/app/generated/prisma/client"
import { getPrisma } from "@/lib/db"
import { requireOpsStaff, type OpsStaff } from "@/lib/ops-auth"

export type OpsSnapshot<T> = { staff: OpsStaff; data: T } | { staff: OpsStaff; data: "offline" }

async function read<T>(work: () => Promise<T>): Promise<T | "offline"> {
  try {
    await connection()
    return await work()
  } catch {
    return "offline"
  }
}

export async function loadOpsOverview(): Promise<
  OpsSnapshot<{
    publishedExpeditions: number
    pendingRequests: number
    openDepartures: number
    leads: { id: string; name: string; kind: string; status: string; createdAt: string }[]
  }>
> {
  const staff = await requireOpsStaff()
  const data = await read(async () => {
    const prisma = getPrisma()
    const [publishedExpeditions, pendingRequests, openDepartures, leads] = await Promise.all([
      prisma.expedition.count({ where: { status: ExpeditionStatus.PUBLISHED } }),
      prisma.booking.count({ where: { status: BookingStatus.REQUESTED } }),
      prisma.departure.count({ where: { status: DepartureStatus.OPEN } }),
      prisma.enquiry.findMany({
        where: { status: EnquiryStatus.OPEN },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, kind: true, status: true, createdAt: true },
      }),
    ])
    return {
      publishedExpeditions,
      pendingRequests,
      openDepartures,
      leads: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        kind: lead.kind,
        status: lead.status,
        createdAt: lead.createdAt.toISOString(),
      })),
    }
  })
  return { staff, data }
}

export async function loadOpsExpeditions(): Promise<
  OpsSnapshot<{ id: string; title: string; vehicleClass: string; status: string; seasonLabel: string; regionName: string }[]>
> {
  const staff = await requireOpsStaff()
  const data = await read(() =>
    getPrisma().expedition.findMany({
      orderBy: [{ status: "asc" }, { title: "asc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        vehicleClass: true,
        status: true,
        seasonLabel: true,
        region: { select: { name: true } },
      },
    }),
  )
  if (data === "offline") return { staff, data }
  return {
    staff,
    data: data.map((row) => ({
      id: row.id,
      title: row.title,
      vehicleClass: row.vehicleClass,
      status: row.status,
      seasonLabel: row.seasonLabel,
      regionName: row.region.name,
    })),
  }
}

export async function loadOpsDepartures(): Promise<
  OpsSnapshot<
    {
      id: string
      title: string
      vehicleClass: string
      startDate: string
      endDate: string
      status: string
      seatsRemaining: number
      capacity: number
      pricePaisa: number
    }[]
  >
> {
  const staff = await requireOpsStaff()
  const data = await read(() =>
    getPrisma().departure.findMany({
      where: { status: { in: [DepartureStatus.OPEN, DepartureStatus.FULL, DepartureStatus.CLOSED] } },
      orderBy: { startDate: "asc" },
      take: 40,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        seatsRemaining: true,
        capacity: true,
        pricePaisa: true,
        expedition: { select: { title: true, vehicleClass: true } },
      },
    }),
  )
  if (data === "offline") return { staff, data }
  return {
    staff,
    data: data.map((row) => ({
      id: row.id,
      title: row.expedition.title,
      vehicleClass: row.expedition.vehicleClass,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      status: row.status,
      seatsRemaining: row.seatsRemaining,
      capacity: row.capacity,
      pricePaisa: row.pricePaisa,
    })),
  }
}

export async function loadOpsManifests(): Promise<
  OpsSnapshot<{ id: string; title: string; startDate: string; status: string; leads: string[]; partySize: number }[]>
> {
  const staff = await requireOpsStaff()
  const data = await read(() =>
    getPrisma().departure.findMany({
      where: { bookings: { some: { status: { not: BookingStatus.CANCELLED } } } },
      orderBy: { startDate: "asc" },
      take: 30,
      select: {
        id: true,
        startDate: true,
        status: true,
        expedition: { select: { title: true } },
        bookings: {
          where: { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] } },
          select: {
            partySize: true,
            travelers: { where: { isLead: true }, select: { fullName: true } },
          },
        },
      },
    }),
  )
  if (data === "offline") return { staff, data }
  return {
    staff,
    data: data.map((row) => ({
      id: row.id,
      title: row.expedition.title,
      startDate: row.startDate.toISOString(),
      status: row.status,
      partySize: row.bookings.reduce((sum, booking) => sum + booking.partySize, 0),
      leads: row.bookings.flatMap((booking) => booking.travelers.map((traveler) => traveler.fullName)),
    })),
  }
}
