"use client"

import { useActionState } from "react"
import { signInOps } from "@/app/(ops)/ops/actions"

const initial = { message: "" }

export function LoginForm() {
  const [state, action, pending] = useActionState(signInOps, initial)
  return (
    <form action={action} className="mt-8 grid gap-5">
      {state.message ? (
        <p className="rounded-2xl border border-danger/40 bg-paper px-4 py-3 text-base text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-base font-semibold text-ink" htmlFor="ops-email">
        Staff email
        <input
          id="ops-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="min-h-11 rounded-md border border-line bg-paper px-4 text-base font-normal text-ink"
        />
      </label>
      <label className="flex flex-col gap-2 text-base font-semibold text-ink" htmlFor="ops-password">
        Password
        <input
          id="ops-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 rounded-md border border-line bg-paper px-4 text-base font-normal text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  )
}
