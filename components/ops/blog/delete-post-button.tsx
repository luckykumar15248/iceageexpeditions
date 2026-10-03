"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { deleteBlogPostAction } from "@/app/(ops)/ops/blog-actions"

export function DeletePostButton({ id, title, redirectTo }: { id: string; title: string; redirectTo?: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function remove() {
    setError("")
    startTransition(async () => {
      const result = await deleteBlogPostAction(id)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setConfirming(false)
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center rounded-md border border-danger/40 px-4 text-sm font-semibold text-danger hover:bg-danger/5"
        aria-label={`Delete “${title}”`}
      >
        Delete
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm deleting “${title}”`}>
      <span className="text-sm text-ink">Delete this post and its comments?</span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink"
      >
        Cancel
      </button>
      {error ? (
        <p className="w-full text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
