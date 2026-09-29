"use server"

import { revalidateTag } from "next/cache"
import { ExperienceLevel } from "@/app/generated/prisma/client"
import { createBooking } from "@/lib/bookings"
import { DomainError } from "@/lib/errors"
import type { BookingFormState } from "@/lib/form-state"
import type { TravelerDraft } from "@/lib/party"

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function experience(value: string): ExperienceLevel {
  if (value === "SOME" || value === "EXPERIENCED" || value === "ADVANCED" || value === "NONE") return value
  return "NONE"
}

function travelerFrom(formData: FormData, prefix: string, isPillion: boolean): TravelerDraft {
  return {
    fullName: read(formData, `${prefix}Name`),
    email: read(formData, `${prefix}Email`),
    phone: read(formData, `${prefix}Phone`),
    emergencyName: read(formData, `${prefix}EmergencyName`),
    emergencyPhone: read(formData, `${prefix}EmergencyPhone`),
    experienceLevel: experience(read(formData, `${prefix}Experience`)),
    isPillion,
    medicalDeclaration: read(formData, `${prefix}Medical`),
    fitnessAcknowledged: formData.get(`${prefix}Fitness`) === "yes",
  }
}

export async function submitBooking(
  _previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const departureId = read(formData, "departureId")
  const lead = travelerFrom(formData, "lead", false)
  const travelers = [lead]
  if (formData.get("includePillion") === "yes") {
    travelers.push(travelerFrom(formData, "pillion", true))
  }

  try {
    const booking = await createBooking({
      departureId,
      policyAcknowledged: formData.get("policyAcknowledged") === "yes",
      travelers,
    })
    revalidateTag("catalog", "seconds")
    return {
      status: "success",
      message: `Request ${booking.reference} is in. This holds a request, not a captured payment. Ops will confirm the ${booking.partySize === 1 ? "place" : "places"}.`,
      reference: booking.reference,
      fieldErrors: {},
    }
  } catch (error) {
    console.error("[booking] submission was not saved", {
      departureId,
      code: error instanceof DomainError ? error.code : "UNEXPECTED",
    })
    const message =
      error instanceof DomainError ? error.message : "The booking request could not be saved. Try again."
    return { status: "error", message, reference: "", fieldErrors: bookingFieldErrors(message) }
  }
}

function bookingFieldErrors(message: string): Record<string, string> {
  const text = message.toLowerCase()
  if (text.includes("email")) return { leadEmail: message }
  if (text.includes("emergency") && text.includes("phone")) return { leadEmergencyPhone: message }
  if (text.includes("emergency")) return { leadEmergencyName: message }
  if (text.includes("phone")) return { leadPhone: message }
  if (text.includes("name")) return { leadName: message }
  if (text.includes("medical") || text.includes("declaration") || text.includes("fitness")) return { leadMedical: message }
  if (text.includes("experience")) return { leadExperience: message }
  if (text.includes("policy") || text.includes("cancellation")) return { policy: message }
  return {}
}
