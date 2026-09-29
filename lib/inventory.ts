import { DepartureStatus } from "@/app/generated/prisma/client"
import type { DbClient } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"

const RESALE_STATUSES = [DepartureStatus.OPEN, DepartureStatus.FULL] as const

/**
 * Conditional decrement. A concurrent booking that loses the WHERE check
 * cannot drive seatsRemaining below zero.
 */
export async function reserveUnits(db: DbClient, departureId: string, units: number): Promise<void> {
  const reserved = await db.departure.updateMany({
    where: {
      id: departureId,
      status: DepartureStatus.OPEN,
      seatsRemaining: { gte: units },
    },
    data: { seatsRemaining: { decrement: units } },
  })

  if (reserved.count !== 1) {
    const latest = await db.departure.findUnique({
      where: { id: departureId },
      select: { status: true, seatsRemaining: true },
    })
    if (!latest) {
      throw new DomainError(DomainErrorCode.DEPARTURE_NOT_FOUND, "Departure was not found")
    }
    if (latest.status === DepartureStatus.FULL || latest.seatsRemaining < units) {
      throw new DomainError(DomainErrorCode.DEPARTURE_FULL, "Departure does not have enough seats or bike slots")
    }
    throw new DomainError(DomainErrorCode.DEPARTURE_CLOSED, "Departure is not open for booking")
  }

  await db.departure.updateMany({
    where: {
      id: departureId,
      status: DepartureStatus.OPEN,
      seatsRemaining: 0,
    },
    data: { status: DepartureStatus.FULL },
  })
}

/** Return units only while the departure can still be sold. Cancelled batches stay closed. */
export async function releaseUnits(db: DbClient, departureId: string, units: number): Promise<void> {
  const departure = await db.departure.findUnique({
    where: { id: departureId },
    select: { id: true, status: true, seatsRemaining: true, capacity: true },
  })
  if (!departure) {
    throw new DomainError(DomainErrorCode.DEPARTURE_NOT_FOUND, "Departure was not found")
  }
  if (departure.status !== DepartureStatus.OPEN && departure.status !== DepartureStatus.FULL) {
    return
  }
  if (departure.seatsRemaining + units > departure.capacity) {
    throw new DomainError(DomainErrorCode.INVENTORY_CONFLICT, "Release would exceed departure capacity")
  }

  const released = await db.departure.updateMany({
    where: {
      id: departureId,
      status: { in: [...RESALE_STATUSES] },
      seatsRemaining: departure.seatsRemaining,
    },
    data: { seatsRemaining: { increment: units } },
  })
  if (released.count !== 1) {
    throw new DomainError(DomainErrorCode.INVENTORY_CONFLICT, "Inventory changed during release")
  }

  await db.departure.updateMany({
    where: {
      id: departureId,
      status: DepartureStatus.FULL,
      seatsRemaining: { gt: 0 },
    },
    data: { status: DepartureStatus.OPEN },
  })
}
