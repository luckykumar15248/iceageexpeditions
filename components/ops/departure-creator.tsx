"use client"

import { useActionState } from "react"
import { createDepartureAction, type CmsFormState } from "@/app/(ops)/ops/cms-actions"

const initial: CmsFormState = { message: "", ok: false }
const field = "min-h-11 rounded-md border border-line bg-paper px-4 text-base font-normal text-ink"

export function DepartureCreator({ expeditionId }: { expeditionId: string }) {
  const [state, action, pending] = useActionState(createDepartureAction, initial)
  return (
    <form action={action} className="mt-8 grid gap-5 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Add a departure</h2>
      <p className="text-base leading-relaxed text-muted">
        Capacity is SUV seats or motorbike slots for this vehicle class. A new batch starts with every place still open. Saving a draft does not make it bookable.
      </p>
      {state.message ? (
        <p className="rounded-2xl border border-danger/40 px-4 py-3 text-base text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="expeditionId" value={expeditionId} />
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Start date
          <input name="startDate" type="date" required className={field} />
        </label>
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          End date
          <input name="endDate" type="date" required className={field} />
        </label>
        <label className="flex flex-col gap-2 text-base font-semibold text-ink md:col-span-2">
          Meeting point
          <input name="meetingPoint" required className={field} />
        </label>
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Capacity
          <input name="capacity" type="number" min={1} required className={field} />
        </label>
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Status
          <select name="status" defaultValue="DRAFT" className={field}>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Price (INR)
          <input name="priceRupees" inputMode="decimal" required className={field} />
        </label>
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Deposit (INR)
          <input name="depositRupees" inputMode="decimal" required className={field} />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Cancellation terms
        <textarea name="policySnapshot" required rows={4} className={`${field} min-h-32 py-3`} />
      </label>
      <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60">
        {pending ? "Saving…" : "Add departure"}
      </button>
    </form>
  )
}
