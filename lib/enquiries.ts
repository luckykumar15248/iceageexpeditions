import { AuditAction, DepartureStatus, EnquiryKind, type VehicleClass } from "@/app/generated/prisma/client"
import { writeAudit } from "@/lib/audit"
import { getPrisma } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const WAITLIST_STATUSES: DepartureStatus[] = [
  DepartureStatus.FULL,
  DepartureStatus.CLOSED,
  DepartureStatus.CANCELLED,
]

export type CreateEnquiryInput = {
  kind: EnquiryKind
  name: string
  email: string
  phone: string
  message: string
  expeditionId?: string | null
  departureId?: string | null
  vehicleClass?: VehicleClass | null
  preferredMonth?: string | null
  partySize?: number | null
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<{ id: string; kind: EnquiryKind }> {
  const name = requireText(input.name, "A name is required")
  const email = input.email.trim().toLowerCase()
  const phone = requireText(input.phone, "A phone number is required")
  const message = requireText(input.message, "A message is required")
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new DomainError(DomainErrorCode.ENQUIRY_INVALID, "A valid email is required")
  }
  if (input.preferredMonth && !MONTH.test(input.preferredMonth)) {
    throw new DomainError(DomainErrorCode.ENQUIRY_INVALID, "Preferred month must look like YYYY-MM")
  }
  if (input.partySize != null && (!Number.isInteger(input.partySize) || input.partySize < 1)) {
    throw new DomainError(DomainErrorCode.ENQUIRY_INVALID, "Party size must be a positive integer")
  }

  if (input.kind === EnquiryKind.WAITLIST && !input.departureId) {
    throw new DomainError(DomainErrorCode.ENQUIRY_INVALID, "A waitlist request needs a departure")
  }
  if (input.kind === EnquiryKind.CUSTOM_PRIVATE && !input.vehicleClass) {
    throw new DomainError(DomainErrorCode.ENQUIRY_INVALID, "A private group request needs a vehicle class")
  }

  const prisma = getPrisma()
  if (input.kind === EnquiryKind.WAITLIST && input.departureId) {
    const departure = await prisma.departure.findUnique({
      where: { id: input.departureId },
      select: { id: true, status: true, expeditionId: true },
    })
    if (!departure || !WAITLIST_STATUSES.includes(departure.status)) {
      if (departure?.status === DepartureStatus.OPEN) {
        throw new DomainError(DomainErrorCode.DEPARTURE_OPEN, "This departure is open. Book it instead of joining the waitlist")
      }
      throw new DomainError(DomainErrorCode.DEPARTURE_NOT_FOUND, "That departure is not accepting a waitlist")
    }
    input = { ...input, expeditionId: input.expeditionId ?? departure.expeditionId }
  }

  return prisma.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.create({
      data: {
        kind: input.kind,
        name,
        email,
        phone,
        message,
        expeditionId: input.expeditionId ?? null,
        departureId: input.departureId ?? null,
        vehicleClass: input.vehicleClass ?? null,
        preferredMonth: input.preferredMonth ?? null,
        partySize: input.partySize ?? null,
      },
      select: { id: true, kind: true },
    })

    await writeAudit(tx, {
      action: AuditAction.ENQUIRY_CREATED,
      entityType: "Enquiry",
      entityId: enquiry.id,
      reason: "Guest enquiry received",
      after: {
        kind: enquiry.kind,
        expeditionId: input.expeditionId ?? null,
        departureId: input.departureId ?? null,
        partySize: input.partySize ?? null,
      },
    })

    return enquiry
  })
}

function requireText(value: string, message: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new DomainError(DomainErrorCode.ENQUIRY_INVALID, message)
  return trimmed
}
