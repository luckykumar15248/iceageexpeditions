export type EnquiryField =
  | "name"
  | "email"
  | "phone"
  | "preferredMonth"
  | "partySize"
  | "message"
  | "vehicleClass"
  | "experience"
  | "fitnessNote"
  | "fitnessAck"
  | "captcha"

export type EnquiryFormState = {
  status: "idle" | "success" | "error"
  message: string
  fieldErrors: Partial<Record<EnquiryField, string>>
  values: {
    name: string
    email: string
    phone: string
    preferredMonth: string
    partySize: string
    message: string
    kind: string
    departureId: string
    vehicleClass: string
    experience: string
    fitnessNote: string
  }
}

export const initialEnquiryState: EnquiryFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: {
    name: "",
    email: "",
    phone: "",
    preferredMonth: "",
    partySize: "",
    message: "",
    kind: "GENERAL",
    departureId: "",
    vehicleClass: "",
    experience: "",
    fitnessNote: "",
  },
}

export type BookingFormState = {
  status: "idle" | "success" | "error"
  message: string
  reference: string
  fieldErrors: Record<string, string>
}

export const initialBookingState: BookingFormState = {
  status: "idle",
  message: "",
  reference: "",
  fieldErrors: {},
}
