"use client"

import { useRouter } from "next/navigation"
import { useId, useState, useTransition } from "react"
import { deleteBlogCategoryAction, saveBlogCategoryAction, type CategorySaveResult } from "@/app/(ops)/ops/blog-actions"
import type { OpsCategoryRow } from "@/lib/blog-admin"
import { BLOG_LIMITS, slugifyBlog } from "@/lib/blog-schema"

type Draft = { id?: string; name: string; slug: string; description: string; sortOrder: string }

const EMPTY: Draft = { name: "", slug: "", description: "", sortOrder: "0" }

export function CategoryManager({ categories, canWrite }: { categories: OpsCategoryRow[]; canWrite: boolean }) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="category-list-heading">
        <h2 id="category-list-heading" className="font-display text-xl font-bold text-ink">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </h2>
        {categories.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-base text-muted">
            No categories yet. Start with a few broad sections such as Route guides, Riding skills, Altitude and health, and Gear.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {categories.map((category) =>
              editing === category.id ? (
                <li key={category.id} className="rounded-2xl border border-alpine bg-paper p-5">
                  <CategoryForm
                    initial={{ id: category.id, name: category.name, slug: category.slug, description: category.description, sortOrder: String(category.sortOrder) }}
                    onDone={() => setEditing(null)}
                  />
                </li>
              ) : (
                <li key={category.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-paper p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-ink">{category.name}</p>
                    <p className="text-sm text-muted">
                      /blog?category={category.slug} · order {category.sortOrder} · {category.postCount} post{category.postCount === 1 ? "" : "s"}
                    </p>
                    {category.description ? <p className="mt-2 text-base text-ink">{category.description}</p> : null}
                  </div>
                  {canWrite ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setEditing(category.id)} className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:border-alpine">
                        Edit
                      </button>
                      <DeleteCategory id={category.id} name={category.name} postCount={category.postCount} />
                    </div>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}
      </section>
      {canWrite ? (
        <section aria-labelledby="new-category-heading" className="h-fit rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <h2 id="new-category-heading" className="font-display text-xl font-bold text-ink">
            Add a category
          </h2>
          <div className="mt-4">
            <CategoryForm initial={EMPTY} />
          </div>
        </section>
      ) : null}
    </div>
  )
}

function CategoryForm({ initial, onDone }: { initial: Draft; onDone?: () => void }) {
  const router = useRouter()
  const ids = useId()
  const [draft, setDraft] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const [result, setResult] = useState<CategorySaveResult | null>(null)
  const [pending, startTransition] = useTransition()
  const errors = result?.fieldErrors ?? {}

  function submit() {
    startTransition(async () => {
      const response = await saveBlogCategoryAction({
        id: draft.id,
        name: draft.name,
        slug: draft.slug,
        description: draft.description,
        sortOrder: Number.parseInt(draft.sortOrder, 10) || 0,
      })
      setResult(response)
      if (!response.ok) return
      if (!draft.id) {
        setDraft(EMPTY)
        setSlugTouched(false)
      }
      router.refresh()
      onDone?.()
    })
  }

  const field = "min-h-11 w-full rounded-md border bg-paper px-3 text-base text-ink"
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="grid gap-4"
    >
      {result ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${result.ok ? "bg-alpine-soft text-ink" : "border border-danger/40 text-danger"}`} role={result.ok ? "status" : "alert"}>
          {result.message}
        </p>
      ) : null}
      <label htmlFor={`${ids}-name`} className="grid gap-1 text-sm font-semibold text-ink">
        Name
        <input
          id={`${ids}-name`}
          value={draft.name}
          required
          maxLength={BLOG_LIMITS.categoryName}
          onChange={(event) => {
            const name = event.target.value
            setDraft((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugifyBlog(name, 100) }))
          }}
          aria-invalid={errors.name ? true : undefined}
          className={`${field} ${errors.name ? "border-danger" : "border-line"}`}
        />
        {errors.name ? <span className="font-normal text-danger">{errors.name}</span> : null}
      </label>
      <label htmlFor={`${ids}-slug`} className="grid gap-1 text-sm font-semibold text-ink">
        Slug
        <input
          id={`${ids}-slug`}
          value={draft.slug}
          maxLength={100}
          onChange={(event) => {
            setSlugTouched(true)
            setDraft((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
          }}
          aria-invalid={errors.slug ? true : undefined}
          className={`${field} ${errors.slug ? "border-danger" : "border-line"}`}
        />
        {errors.slug ? <span className="font-normal text-danger">{errors.slug}</span> : null}
      </label>
      <label htmlFor={`${ids}-description`} className="grid gap-1 text-sm font-semibold text-ink">
        Description <span className="font-normal text-muted">(optional)</span>
        <textarea
          id={`${ids}-description`}
          value={draft.description}
          rows={2}
          maxLength={BLOG_LIMITS.categoryDescription}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal text-ink"
        />
        {errors.description ? <span className="font-normal text-danger">{errors.description}</span> : null}
      </label>
      <label htmlFor={`${ids}-order`} className="grid gap-1 text-sm font-semibold text-ink">
        Order on the blog <span className="font-normal text-muted">(lower first)</span>
        <input
          id={`${ids}-order`}
          type="number"
          min={0}
          max={999}
          value={draft.sortOrder}
          onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))}
          className={`${field} border-line`}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-md bg-alpine px-5 text-base font-semibold text-white hover:bg-alpine-deep disabled:opacity-60">
          {pending ? "Saving…" : draft.id ? "Save category" : "Add category"}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="inline-flex min-h-11 items-center rounded-md border border-line px-5 text-base font-semibold text-ink">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

function DeleteCategory({ id, name, postCount }: { id: string; name: string; postCount: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete category ${name}`} className="inline-flex min-h-11 items-center rounded-md border border-danger/40 px-4 text-sm font-semibold text-danger">
        Delete
      </button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm deleting ${name}`}>
      <span className="text-sm text-ink">{postCount > 0 ? `${postCount} post${postCount === 1 ? "" : "s"} become uncategorised.` : "Delete?"}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteBlogCategoryAction(id)
            if (!result.ok) {
              setError(result.message)
              return
            }
            router.refresh()
          })
        }
        className="inline-flex min-h-11 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink">
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
