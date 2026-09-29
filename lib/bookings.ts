import { randomBytes } from "node:crypto"
import {
  AuditAction,
  BookingStatus,
  DepartureStatus,
  EnquiryKind,
  EnquiryStatus,
  ExpeditionStatus,
  Prisma,
} from "@/app/generated/prisma/client"
import { writeAudit } from "@/lib/audit"
import { isFutureDepartureDate } from "@/lib/dates"
import { isUniqueConflict, runSerializable } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"
import { releaseUnits, reserveUnits } from "@/lib/inventory"
import { assertPartyForVehicle, assertTravelerDrafts, type TravelerDraft } from "@/lib/party"
import { quoteUnits } from "@/lib/pricing"
import { requireStaff, StaffPermission } from "@/lib/staff"

const HOLDING_STATUSES = [
  BookingStatus.REQUESTED,
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.DEPOSIT_PAID,
  BookingStatus.PAID,
] as const

const travelerSelect = {
  id: true,
  isLead: true,
  isPillion: true,
  fullName: true,
  email: true,
  phone: true,
  emergencyName: true,
  emergencyPhone: true,
  experienceLevel: true,
} satisfies Prisma.TravelerSelect

export type PublicTraveler = Prisma.TravelerGetPayload<{ select: typeof travelerSelect }>

export type PublicBooking = {
  id: string
  reference: string
  departureId: string
  status: BookingStatus
  partySize: number
  amountDuePaisa: number
  depositDuePaisa: number
  balancePaisa: number
  travelers: PublicTraveler[]
}

export type CreateBookingInput = {
  departureId: string
  policyAcknowledged: boolean
  travelers: TravelerDraft[]
}

export async function createBooking(input: CreateBookingInput): Promise<PublicBooking> {
  if (input.policyAcknowledged !== true) {
    throw new DomainError(
      DomainErrorCode.POLICY_NOT_ACKNOWLEDGED,
      "Cancellation terms must be acknowledged before a booking is created",
    )
  }
  assertTravelerDrafts(input.travelers)

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await createBookingOnce(input)
    } catch (error) {
      if (attempt === 3 || !isUniqueConflict(error)) throw error
    }
  }

  throw new DomainError(DomainErrorCode.INVENTORY_CONFLICT, "Could not allocate a booking reference")
}

export async function cancelBooking(input: {
  bookingId: string
  staffId: string
  reason: string
}): Promise<{ id: string; reference: string; status: BookingStatus }> {
  const staff = await requireStaff(input.staffId, StaffPermission.bookingCancel)
  const reason = input.reason.trim()
  if (reason.length < 3) {
    throw new DomainError(DomainErrorCode.REASON_REQUIRED, "A cancellation reason is required")
  }

  return runSerializable(async (tx) => {
    const actor = await tx.staffUser.findUnique({
      where: { id: staff.id },
      select: { id: true, role: true, isActive: true },
    })
    if (!actor?.isActive) {
      throw new DomainError(DomainErrorCode.STAFF_INACTIVE, "Staff account is inactive")
    }

    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        reference: true,
        status: true,
        unitsHeld: true,
        departureId: true,
      },
    })
    if (!booking) {
      throw new DomainError(DomainErrorCode.BOOKING_NOT_FOUND, "Booking was not found")
    }
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      return { id: booking.id, reference: booking.reference, status: booking.status }
    }
    if (!HOLDING_STATUSES.some((status) => status === booking.status)) {
      throw new DomainError(DomainErrorCode.BOOKING_NOT_CANCELLABLE, "Booking cannot be cancelled from its current state")
    }

    const updated = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: booking.status,
        unitsHeld: booking.unitsHeld,
      },
      data: {
        status: BookingStatus.CANCELLED,
        unitsHeld: 0,
        cancelledAt: new Date(),
        cancelReason: reason,
        cancelledByStaffId: actor.id,
      },
    })
    if (updated.count !== 1) {
      throw new DomainError(DomainErrorCode.INVENTORY_CONFLICT, "Booking changed before it could be cancelled")
    }

    if (booking.unitsHeld > 0) {
      await releaseUnits(tx, booking.departureId, booking.unitsHeld)
    }

    await writeAudit(tx, {
      actorStaffId: actor.id,
      action: AuditAction.BOOKING_CANCELLED,
      entityType: "Booking",
      entityId: booking.id,
      reason,
      before: { status: booking.status, unitsHeld: booking.unitsHeld },
      after: { status: BookingStatus.CANCELLED, unitsHeld: 0 },
    })

    return { id: booking.id, reference: booking.reference, status: BookingStatus.CANCELLED }
  })
}

async function createBookingOnce(input: CreateBookingInput): Promise<PublicBooking> {
  return runSerializable(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { id: input.departureId },
      select: {
        id: true,
        status: true,
        startDate: true,
        seatsRemaining: true,
        pillionConsumesSlot: true,
        pricePaisa: true,
        depositPaisa: true,
        policySnapshot: true,
        expedition: { select: { id: true, status: true, vehicleClass: true } },
      },
    })

    if (
      !departure ||
      departure.expedition.status !== ExpeditionStatus.PUBLISHED ||
      departure.status === DepartureStatus.DRAFT
    ) {
      throw new DomainError(DomainErrorCode.DEPARTURE_NOT_FOUND, "Departure is not available")
    }
    if (departure.status === DepartureStatus.FULL) {
      throw new DomainError(DomainErrorCode.DEPARTURE_FULL, "Departure is full")
    }
    if (departure.status !== DepartureStatus.OPEN || !isFutureDepartureDate(departure.startDate)) {
      throw new DomainError(DomainErrorCode.DEPARTURE_NOT_OPEN, "Departure is not open for booking")
    }

    const units = assertPartyForVehicle(
      departure.expedition.vehicleClass,
      input.travelers,
      departure.pillionConsumesSlot,
    )
    const quote = quoteUnits(departure.pricePaisa, departure.depositPaisa, units)
    await reserveUnits(tx, departure.id, units)

    const booking = await tx.booking.create({
      data: {
        departureId: departure.id,
        reference: createBookingReference(),
        status: BookingStatus.REQUESTED,
        partySize: units,
        unitsHeld: units,
        amountDuePaisa: quote.totalPaisa,
        depositDuePaisa: quote.depositPaisa,
        amountPaidPaisa: 0,
        policyAcknowledgedAt: new Date(),
        policySnapshot: departure.policySnapshot,
        travelers: {
          create: input.travelers.map((traveler, index) => ({
            isLead: index === 0,
            isPillion: traveler.isPillion,
            fullName: traveler.fullName.trim(),
            email: traveler.email.trim().toLowerCase(),
            phone: traveler.phone.trim(),
            emergencyName: traveler.emergencyName.trim(),
            emergencyPhone: traveler.emergencyPhone.trim(),
            experienceLevel: traveler.experienceLevel,
            medical: {
              create: {
                declarationText: traveler.medicalDeclaration.trim(),
                fitnessAcknowledged: true,
              },
            },
          })),
        },
      },
      select: {
        id: true,
        reference: true,
        departureId: true,
        status: true,
        partySize: true,
        amountDuePaisa: true,
        depositDuePaisa: true,
        travelers: { select: travelerSelect },
      },
    })

    await writeAudit(tx, {
      action: AuditAction.BOOKING_CREATED,
      entityType: "Booking",
      entityId: booking.id,
      reason: "Guest booking request",
      after: {
        reference: booking.reference,
        departureId: booking.departureId,
        units,
        amountDuePaisa: quote.totalPaisa,
        depositDuePaisa: quote.depositPaisa,
      },
    })

    const lead = input.travelers[0]
    if (!lead) {
      throw new DomainError(DomainErrorCode.INVALID_PARTY, "A booking needs a lead traveler")
    }
    const enquiry = await tx.enquiry.create({
      data: {
        kind: EnquiryKind.BOOKING_REQUEST,
        status: EnquiryStatus.OPEN,
        expeditionId: departure.expedition.id,
        departureId: departure.id,
        vehicleClass: departure.expedition.vehicleClass,
        name: lead.fullName.trim(),
        email: lead.email.trim().toLowerCase(),
        phone: lead.phone.trim(),
        partySize: input.travelers.length,
        message: `Booking request ${booking.reference}. Party of ${input.travelers.length}. Holds ${units} ${units === 1 ? "place" : "places"}. This is a request, not a confirmed seat.`,
      },
      select: { id: true },
    })

    await writeAudit(tx, {
      action: AuditAction.ENQUIRY_CREATED,
      entityType: "Enquiry",
      entityId: enquiry.id,
      reason: "Booking request recorded on the leads desk",
      after: {
        kind: EnquiryKind.BOOKING_REQUEST,
        bookingId: booking.id,
        departureId: departure.id,
        partySize: input.travelers.length,
      },
    })

    return {
      ...booking,
      balancePaisa: quote.balancePaisa,
    }
  })
}

function createBookingReference(): string {
  return `IAE-${randomBytes(4).toString("hex").toUpperCase()}`
}
