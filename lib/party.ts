import { VehicleClass, type ExperienceLevel } from "@/app/generated/prisma/client"
import { DomainError, DomainErrorCode } from "@/lib/errors"

export const MAX_TRAVELERS = 24

export type TravelerDraft = {
  fullName: string
  email: string
  phone: string
  emergencyName: string
  emergencyPhone: string
  experienceLevel: ExperienceLevel
  isPillion: boolean
  medicalDeclaration: string
  fitnessAcknowledged: boolean
}

export function countInventoryUnits(
  travelers: { isPillion: boolean }[],
  pillionConsumesSlot: boolean,
): number {
  if (pillionConsumesSlot) return travelers.length
  return travelers.filter((traveler) => !traveler.isPillion).length
}

export function assertTravelerDrafts(travelers: TravelerDraft[]): void {
  if (travelers.length < 1 || travelers.length > MAX_TRAVELERS) {
    throw new DomainError(
      DomainErrorCode.INVALID_PARTY,
      `A booking needs between 1 and ${MAX_TRAVELERS} travelers`,
    )
  }

  for (const traveler of travelers) {
    requireText(traveler.fullName, DomainErrorCode.INVALID_PARTY, "Each traveler needs a name")
    requireText(traveler.phone, DomainErrorCode.INVALID_PARTY, "Each traveler needs a phone number")
    requireEmail(traveler.email)
    requireText(
      traveler.emergencyName,
      DomainErrorCode.EMERGENCY_CONTACT_REQUIRED,
      "Each traveler needs an emergency contact name",
    )
    requireText(
      traveler.emergencyPhone,
      DomainErrorCode.EMERGENCY_CONTACT_REQUIRED,
      "Each traveler needs an emergency contact phone",
    )
    if (!traveler.fitnessAcknowledged || traveler.medicalDeclaration.trim().length < 3) {
      throw new DomainError(
        DomainErrorCode.MEDICAL_REQUIRED,
        "Each traveler must acknowledge fitness and provide a short self-declaration",
      )
    }
  }
}

export function assertPartyForVehicle(
  vehicleClass: VehicleClass,
  travelers: TravelerDraft[],
  pillionConsumesSlot: boolean,
): number {
  if (vehicleClass === VehicleClass.SUV_4X4 && travelers.some((traveler) => traveler.isPillion)) {
    throw new DomainError(DomainErrorCode.INVALID_PARTY, "SUV bookings do not use pillion slots")
  }

  const units = countInventoryUnits(travelers, pillionConsumesSlot)
  if (units < 1) {
    throw new DomainError(
      DomainErrorCode.INVALID_PARTY,
      "A motorbike booking needs at least one rider. A pillion does not take a bike slot unless the departure says so",
    )
  }

  if (vehicleClass === VehicleClass.MOTORBIKE) {
    const unqualifiedRider = travelers.some(
      (traveler) => !traveler.isPillion && traveler.experienceLevel === "NONE",
    )
    if (unqualifiedRider) {
      throw new DomainError(
        DomainErrorCode.EXPERIENCE_REQUIRED,
        "Each motorbike rider must record some riding experience",
      )
    }
  }

  return units
}

function requireText(value: string, code: DomainErrorCode, message: string): void {
  if (value.trim().length === 0) throw new DomainError(code, message)
}

function requireEmail(value: string): void {
  const email = value.trim()
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new DomainError(DomainErrorCode.INVALID_PARTY, "Each traveler needs a valid email")
  }
}
