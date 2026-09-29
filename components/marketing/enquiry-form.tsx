"use client"

import { useActionState } from "react"
import { submitEnquiry } from "@/app/(marketing)/actions"
import { initialEnquiryState, type EnquiryFormState } from "@/lib/form-state"

export type EnquiryDepartureOption = {
  id: string
  label: string
}

export function EnquiryForm({
  expeditionId,
  vehicleClass,
  departures,
  heading = "Send an enquiry",
  conversion = false,
  defaultMessage = "",
  defaultVehicle = "",
  defaultEmail = "",
}: {
  expeditionId?: string
  vehicleClass?: "SUV_4X4" | "MOTORBIKE"
  departures?: EnquiryDepartureOption[]
  heading?: string
  conversion?: boolean
  defaultMessage?: string
  defaultVehicle?: "" | "SUV_4X4" | "MOTORBIKE"
  defaultEmail?: string
}) {
  const [state, action, pending] = useActionState(submitEnquiry, initialEnquiryState)

  if (state.status === "success") {
    return (
      <div className="rounded-3xl border border-alpine bg-alpine-soft p-8" role="status">
        <h2 className="font-display text-4xl font-bold text-ink">{heading}</h2>
        <p className="mt-4 text-lg text-muted">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-6 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <div>
        <h2 className="font-display text-4xl font-bold text-ink">{heading}</h2>
        <p className="mt-3 text-lg text-muted">
          Tell us the month, the vehicle, and how many people. We will not invent an open pass to make the answer sound better.
        </p>
      </div>
      {state.status === "error" ? (
        <p className="rounded-2xl border border-danger/40 bg-paper px-4 py-3 text-lg text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      {expeditionId ? <input type="hidden" name="expeditionId" value={expeditionId} /> : null}
      {vehicleClass ? <input type="hidden" name="vehicleClass" value={vehicleClass} /> : null}
      {conversion ? <input type="hidden" name="requireFitness" value="yes" /> : null}
      <Field label="Name" name="name" value={state.values.name} error={state.fieldErrors.name} autoComplete="name" required />
      <Field label="Email" name="email" type="email" value={state.values.email || defaultEmail} error={state.fieldErrors.email} autoComplete="email" required />
      <Field label="Phone" name="phone" type="tel" value={state.values.phone} error={state.fieldErrors.phone} autoComplete="tel" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Preferred month"
          name="preferredMonth"
          value={state.values.preferredMonth}
          placeholder="2026-07"
          hint="Use YYYY-MM if you have a month in mind."
          error={state.fieldErrors.preferredMonth}
        />
        <Field label="Party size" name="partySize" type="number" value={state.values.partySize} error={state.fieldErrors.partySize} min={1} />
      </div>
      {departures && departures.length > 0 ? (
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Departure, if you have one
          <select
            name="departureId"
            defaultValue={state.values.departureId}
            className="min-h-14 rounded-md border border-line bg-paper px-4 text-lg text-ink"
          >
            <option value="">No specific date</option>
            {departures.map((departure) => (
              <option key={departure.id} value={departure.id}>
                {departure.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Request type
        <select
          name="kind"
          defaultValue={state.values.kind}
          className="min-h-14 rounded-md border border-line bg-paper px-4 text-lg text-ink"
        >
          <option value="GENERAL">General question</option>
          <option value="WAITLIST">Waitlist for a full or closed batch</option>
          <option value="CUSTOM_PRIVATE">Custom private group</option>
        </select>
      </label>
      {!vehicleClass ? (
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Vehicle class
          <select
            name="vehicleClass"
            defaultValue={state.values.vehicleClass || defaultVehicle}
            className={`min-h-14 rounded-md border bg-paper px-4 text-lg text-ink ${state.fieldErrors.vehicleClass ? "border-danger" : "border-line"}`}
            aria-invalid={state.fieldErrors.vehicleClass ? true : undefined}
            aria-describedby={state.fieldErrors.vehicleClass ? "vehicleClass-error" : undefined}
          >
            <option value="">Not sure yet</option>
            <option value="SUV_4X4">4x4 SUV</option>
            <option value="MOTORBIKE">Motorbike</option>
          </select>
          {state.fieldErrors.vehicleClass ? (
            <span id="vehicleClass-error" className="text-base font-normal text-danger" role="alert">
              {state.fieldErrors.vehicleClass}
            </span>
          ) : null}
        </label>
      ) : null}
      {conversion ? (
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Experience level
          <select
            name="experience"
            defaultValue={state.values.experience}
            className={`min-h-14 rounded-md border bg-paper px-4 text-lg text-ink ${state.fieldErrors.experience ? "border-danger" : "border-line"}`}
            aria-invalid={state.fieldErrors.experience ? true : undefined}
            aria-describedby={state.fieldErrors.experience ? "experience-error" : undefined}
          >
            <option value="">Choose one</option>
            <option value="NONE">No prior experience</option>
            <option value="SOME">Some experience</option>
            <option value="EXPERIENCED">Experienced</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          {state.fieldErrors.experience ? (
            <span id="experience-error" className="text-base font-normal text-danger" role="alert">
              {state.fieldErrors.experience}
            </span>
          ) : null}
        </label>
      ) : null}
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Message
        <textarea
          name="message"
          required
          rows={5}
          defaultValue={state.values.message || defaultMessage}
          aria-invalid={state.fieldErrors.message ? true : undefined}
          aria-describedby={state.fieldErrors.message ? "message-error" : undefined}
          className={`rounded-md border bg-paper px-4 py-4 text-lg text-ink ${state.fieldErrors.message ? "border-danger" : "border-line"}`}
        />
        {state.fieldErrors.message ? (
          <span id="message-error" className="text-base font-normal text-danger" role="alert">
            {state.fieldErrors.message}
          </span>
        ) : null}
      </label>
      {conversion ? (
        <>
          <label className="flex flex-col gap-2 text-base font-semibold text-ink">
            Fitness self-declaration
            <textarea
              name="fitnessNote"
              rows={4}
              defaultValue={state.values.fitnessNote}
              aria-invalid={state.fieldErrors.fitnessNote ? true : undefined}
              aria-describedby="fitness-hint"
              className={`rounded-md border bg-paper px-4 py-4 text-lg font-normal text-ink ${state.fieldErrors.fitnessNote ? "border-danger" : "border-line"}`}
            />
            <span id="fitness-hint" className="text-base font-normal text-muted">
              A few honest sentences. This is not a doctor’s clearance, and it stays off the public page.
            </span>
            {state.fieldErrors.fitnessNote ? (
              <span className="text-base font-normal text-danger" role="alert">
                {state.fieldErrors.fitnessNote}
              </span>
            ) : null}
          </label>
          <div>
            <label className="flex min-h-14 items-start gap-3 text-lg font-normal text-ink">
              <input type="checkbox" name="fitnessAck" value="yes" className="mt-1 size-5" />
              I understand altitude illness is possible and this note is not a doctor’s clearance.
            </label>
            {state.fieldErrors.fitnessAck ? (
              <p className="text-base text-danger" role="alert">
                {state.fieldErrors.fitnessAck}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  value,
  type = "text",
  hint,
  error,
  ...props
}: {
  label: string
  name: keyof EnquiryFormState["values"]
  value: string
  type?: string
  hint?: string
  error?: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
  min?: number
}) {
  const hintId = hint ? `${name}-hint` : undefined
  const errorId = error ? `${name}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  return (
    <label className="flex flex-col gap-2 text-base font-semibold text-ink">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-14 rounded-md border bg-paper px-4 text-lg text-ink ${error ? "border-danger" : "border-line"}`}
        {...props}
      />
      {hint ? (
        <span id={hintId} className="text-base font-normal text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-base font-normal text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
