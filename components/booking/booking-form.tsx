"use client"

import { useActionState, useState, type FormEvent } from "react"
import type { VehicleClass } from "@/app/generated/prisma/client"
import { submitBooking } from "@/app/(booking)/actions"
import { Captcha, captchaSatisfied, scrollToCaptcha } from "@/components/ui/captcha"
import { CAPTCHA_PROMPT } from "@/lib/captcha-config"
import { initialBookingState } from "@/lib/form-state"

export function BookingForm({
  departureId,
  vehicleClass,
  policySnapshot,
}: {
  departureId: string
  vehicleClass: VehicleClass
  policySnapshot: string
}) {
  const [state, action, pending] = useActionState(submitBooking, initialBookingState)
  const motorbike = vehicleClass === "MOTORBIKE"
  const [captchaPrompt, setCaptchaPrompt] = useState(false)

  function guardCaptcha(event: FormEvent<HTMLFormElement>) {
    if (captchaSatisfied(event.currentTarget)) {
      setCaptchaPrompt(false)
      return
    }
    event.preventDefault()
    setCaptchaPrompt(true)
    scrollToCaptcha(event.currentTarget)
  }

  if (state.status === "success") {
    return (
      <div className="rounded-3xl border border-alpine bg-alpine-soft p-8" role="status">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Request received</h2>
        <p className="mt-4 text-base leading-relaxed text-muted">{state.message}</p>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-alpine-deep">{state.reference}</p>
      </div>
    )
  }

  return (
    <form action={action} onSubmit={guardCaptcha} className="grid gap-8">
      {state.status === "error" ? (
        <p className="rounded-2xl border border-danger/40 bg-paper px-4 py-3 text-base text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="departureId" value={departureId} />
      <TravelerFields prefix="lead" title={motorbike ? "Lead rider" : "Lead guest"} motorbike={motorbike && true} errors={state.fieldErrors} />
      {motorbike ? (
        <fieldset className="grid gap-5 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <legend className="px-2 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Pillion</legend>
          <label className="flex min-h-11 items-center gap-3 text-base text-ink">
            <input type="checkbox" name="includePillion" value="yes" className="size-5" />
            A pillion is traveling on this bike
          </label>
          <p className="text-base leading-relaxed text-muted">Leave this unchecked if you are riding alone. A pillion does not take a second bike slot unless the departure says so.</p>
          <TravelerFields prefix="pillion" title="Pillion details" motorbike={false} errors={state.fieldErrors} />
        </fieldset>
      ) : null}
      <fieldset className="grid gap-4 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
        <legend className="px-2 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Cancellation terms</legend>
        <p className="text-base whitespace-pre-line text-muted">{policySnapshot || "Ops will confirm the cancellation window with this departure before the request is accepted."}</p>
        <label className="flex min-h-11 items-start gap-3 text-base text-ink">
          <input type="checkbox" name="policyAcknowledged" value="yes" className="mt-1 size-5" required aria-invalid={state.fieldErrors.policy ? true : undefined} />
          I have read the cancellation terms for this departure.
        </label>
        {state.fieldErrors.policy ? <p className="text-base text-danger" role="alert">{state.fieldErrors.policy}</p> : null}
      </fieldset>
      <Captcha resetSignal={state} error={captchaPrompt ? CAPTCHA_PROMPT : state.fieldErrors.captcha} />
      <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60">
        {pending ? "Sending request…" : motorbike ? "Request this departure" : "Hold SUV seats"}
      </button>
    </form>
  )
}

function TravelerFields({
  prefix,
  title,
  motorbike,
  errors,
}: {
  prefix: "lead" | "pillion"
  title: string
  motorbike: boolean
  errors: Record<string, string>
}) {
  const invalid = (key: string) => Boolean(errors[`${prefix}${key}`])
  return (
    <fieldset className="grid gap-4">
      <legend className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</legend>
      <label className="grid gap-2 text-base font-semibold text-ink">
        Full name
        <input name={`${prefix}Name`} autoComplete="name" required={prefix === "lead"} aria-invalid={invalid("Name") || undefined} className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${invalid("Name") ? "border-danger" : "border-line"}`} />
        <FieldError message={errors[`${prefix}Name`]} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-base font-semibold text-ink">
          Email
          <input name={`${prefix}Email`} type="email" autoComplete="email" required={prefix === "lead"} aria-invalid={invalid("Email") || undefined} className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${invalid("Email") ? "border-danger" : "border-line"}`} />
          <FieldError message={errors[`${prefix}Email`]} />
        </label>
        <label className="grid gap-2 text-base font-semibold text-ink">
          Phone
          <input name={`${prefix}Phone`} type="tel" autoComplete="tel" required={prefix === "lead"} aria-invalid={invalid("Phone") || undefined} className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${invalid("Phone") ? "border-danger" : "border-line"}`} />
          <FieldError message={errors[`${prefix}Phone`]} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-base font-semibold text-ink">
          Emergency contact name
          <input name={`${prefix}EmergencyName`} required={prefix === "lead"} aria-invalid={invalid("EmergencyName") || undefined} className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${invalid("EmergencyName") ? "border-danger" : "border-line"}`} />
          <FieldError message={errors[`${prefix}EmergencyName`]} />
        </label>
        <label className="grid gap-2 text-base font-semibold text-ink">
          Emergency contact phone
          <input name={`${prefix}EmergencyPhone`} type="tel" required={prefix === "lead"} aria-invalid={invalid("EmergencyPhone") || undefined} className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${invalid("EmergencyPhone") ? "border-danger" : "border-line"}`} />
          <FieldError message={errors[`${prefix}EmergencyPhone`]} />
        </label>
      </div>
      <label className="grid gap-2 text-base font-semibold text-ink">
        Experience
        <select name={`${prefix}Experience`} defaultValue={motorbike ? "SOME" : "NONE"} aria-invalid={invalid("Experience") || undefined} className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${invalid("Experience") ? "border-danger" : "border-line"}`}>
          <option value="NONE">No prior experience</option>
          <option value="SOME">Some experience</option>
          <option value="EXPERIENCED">Experienced</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <FieldError message={errors[`${prefix}Experience`]} />
      </label>
      <label className="grid gap-2 text-base font-semibold text-ink">
        Fitness self-declaration
        <textarea name={`${prefix}Medical`} required={prefix === "lead"} rows={4} aria-invalid={invalid("Medical") || undefined} className={`rounded-md border bg-paper px-4 py-4 text-base font-normal text-ink ${invalid("Medical") ? "border-danger" : "border-line"}`} />
        <span className="text-base font-normal text-muted">A few honest sentences. This stays off the public page.</span>
        <FieldError message={errors[`${prefix}Medical`]} />
      </label>
      <label className="flex min-h-11 items-start gap-3 text-base font-normal text-ink">
        <input type="checkbox" name={`${prefix}Fitness`} value="yes" className="mt-1 size-5" required={prefix === "lead"} />
        I understand altitude illness is possible and this note is not a doctor’s clearance.
      </label>
    </fieldset>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span className="text-base font-normal text-danger" role="alert">
      {message}
    </span>
  )
}
