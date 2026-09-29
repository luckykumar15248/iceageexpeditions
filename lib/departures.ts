import {
  AuditAction,
  BookingStatus,
  DepartureStatus,
  ExpeditionStatus,
  type ExperienceLevel,
} from "@/app/generated/prisma/client"
import { writeAudit } from "@/lib/audit"
import { isFutureDepartureDate } from "@/lib/dates"
import { getPrisma, runSerializable } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"
import { assertStaffPermission, requireStaff, staffHasPermission, StaffPermission } from "@/lib/staff"

const STAFF_TRANSITIONS: Record<DepartureStatus, readonly DepartureStatus[]> = {
  DRAFT: [DepartureStatus.OPEN, DepartureStatus.CANCELLED],
  OPEN: [DepartureStatus.CLOSED, DepartureStatus.CANCELLED, DepartureStatus.COMPLETED],
  FULL: [DepartureStatus.OPEN, DepartureStatus.CLOSED, DepartureStatus.CANCELLED, DepartureStatus.COMPLETED],
  CLOSED: [DepartureStatus.OPEN, DepartureStatus.CANCELLED],
  CANCELLED: [],
  COMPLETED: [],
}

export async function transitionDeparture(input: {
  departureId: string
  staffId: string
  nextStatus: DepartureStatus
  reason: string
}): Promise<{ id: string; status: DepartureStatus }> {
  const staff = await requireStaff(input.staffId, StaffPermission.departureTransition)
  const reason = input.reason.trim()
  if (reason.length < 3) {
    throw new DomainError(DomainErrorCode.REASON_REQUIRED, "An ops reason is required")
  }

  return runSerializable(async (tx) => {
    const actor = await tx.staffUser.findUnique({
      where: { id: staff.id },
      select: { id: true, role: true, isActive: true },
    })
    if (!actor) {
      throw new DomainError(DomainErrorCode.STAFF_NOT_FOUND, "Staff account was not found")
    }
    assertStaffPermission(actor, StaffPermission.departureTransition)

    const departure = await tx.departure.findUnique({
      where: { id: input.departureId },
      select: {
        id: true,
        status: true,
        startDate: true,
        seatsRemaining: true,
        expedition: { select: { status: true } },
      },
    })
    if (!departure) {
      throw new DomainError(DomainErrorCode.DEPARTURE_NOT_FOUND, "Departure was not found")
    }

    const allowed = STAFF_TRANSITIONS[departure.status]
    if (!allowed.includes(input.nextStatus)) {
      throw new DomainError(
        DomainErrorCode.INVALID_TRANSITION,
        `Cannot move a departure from ${departure.status} to ${input.nextStatus}`,
      )
    }
    if (input.nextStatus === DepartureStatus.OPEN) {
      assertCanReopen(departure)
    }

    const updated = await tx.departure.updateMany({
      where: { id: departure.id, status: departure.status },
      data: { status: input.nextStatus },
    })
    if (updated.count !== 1) {
      throw new DomainError(DomainErrorCode.INVENTORY_CONFLICT, "Departure status changed before the override")
    }

    await writeAudit(tx, {
      actorStaffId: actor.id,
      action: AuditAction.DEPARTURE_STATUS_CHANGED,
      entityType: "Departure",
      entityId: departure.id,
      reason,
      before: { status: departure.status },
      after: { status: input.nextStatus },
    })

    return { id: departure.id, status: input.nextStatus }
  })
}

export type ManifestTraveler = {
  id: string
  isLead: boolean
  isPillion: boolean
  fullName: string
  email: string
  phone: string
  emergencyName: string
  emergencyPhone: string
  experienceLevel: ExperienceLevel
  medical?: {
    declarationText: string
    fitnessAcknowledged: boolean
    acknowledgedAt: Date
  } | null
}

export async function getDepartureManifest(
  staffId: string,
  departureId: string,
): Promise<{
  departureId: string
  medicalAccess: boolean
  travelers: ManifestTraveler[]
}> {
  const staff = await requireStaff(staffId, StaffPermission.manifestRead)
  const medicalAccess = staffHasPermission(staff.role, StaffPermission.medicalRead)
  const departure = await runReadManifest(departureId, medicalAccess)
  return { departureId: departure.id, medicalAccess, travelers: departure.travelers }
}

function assertCanReopen(departure: {
  startDate: Date
  seatsRemaining: number
  expedition: { status: ExpeditionStatus }
}): void {
  if (departure.seatsRemaining < 1) {
    throw new DomainError(DomainErrorCode.DEPARTURE_FULL, "Cannot reopen a departure with no remaining units")
  }
  if (!isFutureDepartureDate(departure.startDate)) {
    throw new DomainError(DomainErrorCode.DEPARTURE_CLOSED, "Cannot reopen a departure that has already started")
  }
  if (departure.expedition.status !== ExpeditionStatus.PUBLISHED) {
    throw new DomainError(DomainErrorCode.DEPARTURE_CLOSED, "Publish the expedition before opening a departure")
  }
}

async function runReadManifest(departureId: string, medicalAccess: boolean) {
  const departure = await getPrisma().departure.findUnique({
    where: { id: departureId },
    select: {
      id: true,
      bookings: {
        where: { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] } },
        select: {
          travelers: {
            orderBy: { isLead: "desc" },
            select: {
              id: true,
              isLead: true,
              isPillion: true,
              fullName: true,
              email: true,
              phone: true,
              emergencyName: true,
              emergencyPhone: true,
              experienceLevel: true,
              medical: medicalAccess
                ? {
                    select: {
                      declarationText: true,
                      fitnessAcknowledged: true,
                      acknowledgedAt: true,
                    },
                  }
                : false,
            },
          },
        },
      },
    },
  })
  if (!departure) {
    throw new DomainError(DomainErrorCode.DEPARTURE_NOT_FOUND, "Departure was not found")
  }

  return {
    id: departure.id,
    travelers: departure.bookings.flatMap((booking) => booking.travelers),
  }
}
