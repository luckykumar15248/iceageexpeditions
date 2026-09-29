"use server"

import { EnquiryKind, VehicleClass } from "@/app/generated/prisma/client"
import { createEnquiry } from "@/lib/enquiries"
import { DomainError } from "@/lib/errors"
import type { EnquiryField, EnquiryFormState } from "@/lib/form-state"

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

export async function submitEnquiry(
  _previous: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const values: EnquiryFormState["values"] = {
    name: read(formData, "name"),
    email: read(formData, "email"),
    phone: read(formData, "phone"),
    preferredMonth: read(formData, "preferredMonth"),
    partySize: read(formData, "partySize"),
    message: read(formData, "message"),
    kind: read(formData, "kind") || "GENERAL",
    departureId: read(formData, "departureId"),
    vehicleClass: read(formData, "vehicleClass"),
    experience: read(formData, "experience"),
    fitnessNote: read(formData, "fitnessNote"),
  }
  const fieldErrors: Partial<Record<EnquiryField, string>> = {}
  if (read(formData, "requireFitness") === "yes") {
    if (!values.experience) fieldErrors.experience = "Choose an experience level"
    if (values.fitnessNote.trim().length < 8) fieldErrors.fitnessNote = "Write a short fitness self-declaration"
    if (formData.get("fitnessAck") !== "yes") {
      fieldErrors.fitnessAck = "Confirm that this note is not a doctor’s clearance"
    }
    if (!values.vehicleClass) fieldErrors.vehicleClass = "Choose 4x4 SUV or motorbike"
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
      values,
    }
  }
  const message = [
    values.message.trim(),
    values.experience ? `Experience: ${values.experience}` : "",
    values.fitnessNote.trim() ? `Fitness self-declaration: ${values.fitnessNote.trim()}` : "",
  ]
    .filter((part) => part.length > 0)
    .join("\n\n")
  const expeditionId = read(formData, "expeditionId")
  const kind =
    values.kind === EnquiryKind.WAITLIST || values.kind === EnquiryKind.CUSTOM_PRIVATE
      ? values.kind
      : EnquiryKind.GENERAL
  const vehicle =
    values.vehicleClass === VehicleClass.SUV_4X4 || values.vehicleClass === VehicleClass.MOTORBIKE
      ? values.vehicleClass
      : null
  const partySize = values.partySize.trim() === "" ? null : Number(values.partySize)

  try {
    await createEnquiry({
      kind,
      name: values.name,
      email: values.email,
      phone: values.phone,
      message,
      expeditionId: expeditionId || null,
      departureId: values.departureId || null,
      vehicleClass: vehicle,
      preferredMonth: values.preferredMonth.trim() || null,
      partySize,
    })
    return {
      status: "success",
      message: "Enquiry received. Ops will reply with dates and a straight read on the road. This is not a confirmed seat.",
      fieldErrors: {},
      values,
    }
  } catch (error) {
    console.error("[enquiry] submission was not saved", {
      code: error instanceof DomainError ? error.code : "UNEXPECTED",
    })
    const message =
      error instanceof DomainError
        ? error.message
        : "The enquiry could not be saved. Check the fields and try again."
    return { status: "error", message, fieldErrors: enquiryFieldErrors(message), values }
  }
}

function enquiryFieldErrors(message: string): Partial<Record<EnquiryField, string>> {
  const text = message.toLowerCase()
  if (text.includes("email")) return { email: message }
  if (text.includes("phone")) return { phone: message }
  if (text.includes("name")) return { name: message }
  if (text.includes("month")) return { preferredMonth: message }
  if (text.includes("party")) return { partySize: message }
  if (text.includes("vehicle")) return { vehicleClass: message }
  if (text.includes("message")) return { message: message }
  return {}
}
