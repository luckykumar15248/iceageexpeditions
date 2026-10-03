"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"
import { moderateCommentsAction, type ModerationAction } from "@/app/(ops)/ops/blog-actions"
import type { CommentFilter } from "@/lib/blog-admin"

export type QueueRow = {
  id: string
  status: "PENDING" | "APPROVED" | "SPAM"
  authorName: string
  authorEmail: string
  body: string
  createdLabel: string
  moderatedLabel: string | null
  moderatorName: string | null
  linkCount: number
  sameSourceRecent: number
  post: { id: string; title: string; slug: string; live: boolean }
}

const STATUS_BADGE: Record<QueueRow["status"], { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-800" },
  APPROVED: { label: "Approved", className: "bg-alpine-soft text-alpine-deep" },
  SPAM: { label: "Spam", className: "bg-danger/10 text-danger" },
}

const ROW_ACTIONS: Record<QueueRow["status"], { action: ModerationAction; label: string; tone: "primary" | "plain" | "danger" }[]> = {
  PENDING: [
    { action: "approve", label: "Approve", tone: "primary" },
    { action: "spam", label: "Mark as spam", tone: "plain" },
    { action: "delete", label: "Delete", tone: "danger" },
  ],
  APPROVED: [
    { action: "pending", label: "Unapprove", tone: "plain" },
    { action: "spam", label: "Mark as spam", tone: "plain" },
    { action: "delete", label: "Delete", tone: "danger" },
  ],
  SPAM: [
    { action: "approve", label: "Not spam — approve", tone: "primary" },
    { action: "pending", label: "Back to pending", tone: "plain" },
    { action: "delete", label: "Delete", tone: "danger" },
  ],
}

const TONE: Record<"primary" | "plain" | "danger", string> = {
  primary: "bg-alpine text-white hover:bg-alpine-deep",
  plain: "border border-line bg-paper text-ink hover:border-alpine",
  danger: "border border-danger/40 bg-paper text-danger hover:bg-danger/5",
}

export function CommentQueue({ rows, filter, canModerate }: { rows: QueueRow[]; filter: CommentFilter; canModerate: boolean }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | "bulk" | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [seenRows, setSeenRows] = useState(rows)
  if (seenRows !== rows) {
    setSeenRows(rows)
    setHidden(new Set())
    setSelected((current) => new Set([...current].filter((id) => rows.some((row) => row.id === id))))
  }

  const visible = rows.filter((row) => !hidden.has(row.id))
  const allSelected = visible.length > 0 && visible.every((row) => selected.has(row.id))

  function run(ids: string[], action: ModerationAction) {
    setNotice(null)
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await moderateCommentsAction(ids, action)
      setNotice({ ok: result.ok, message: result.message })
      if (!result.ok) return
      const leavesView = action === "delete" || filter !== "all"
      if (leavesView) setHidden((current) => new Set([...current, ...ids]))
      setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))))
      router.refresh()
    })
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedIds = visible.filter((row) => selected.has(row.id)).map((row) => row.id)

  return (
    <div>
      {notice ? (
        <p
          className={`mb-4 rounded-2xl border px-4 py-3 text-base ${notice.ok ? "border-alpine bg-alpine-soft text-ink" : "border-danger/40 bg-paper text-danger"}`}
          role={notice.ok ? "status" : "alert"}
        >
          {notice.message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper px-6 py-14 text-center">
          <h2 className="font-display text-xl font-bold text-ink">{filter === "pending" ? "The queue is clear" : "Nothing here"}</h2>
          <p className="mt-2 text-base text-muted">
            {filter === "pending" ? "New reader comments land here before anyone else can see them." : "No comments match this view."}
          </p>
        </div>
      ) : (
        <>
          {canModerate ? (
            <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 backdrop-blur">
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((row) => row.id)))}
                  className="size-5 accent-alpine"
                />
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select all on this page"}
              </label>
              {selectedIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filter !== "approved" ? (
                    <BulkButton tone="primary" disabled={pending} onClick={() => run(selectedIds, "approve")}>
                      Approve
                    </BulkButton>
                  ) : null}
                  {filter !== "spam" ? (
                    <BulkButton tone="plain" disabled={pending} onClick={() => run(selectedIds, "spam")}>
                      Mark as spam
                    </BulkButton>
                  ) : null}
                  {confirmDelete === "bulk" ? (
                    <>
                      <BulkButton tone="danger" disabled={pending} onClick={() => run(selectedIds, "delete")}>
                        Confirm delete {selectedIds.length}
                      </BulkButton>
                      <BulkButton tone="plain" disabled={pending} onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </BulkButton>
                    </>
                  ) : (
                    <BulkButton tone="danger" disabled={pending} onClick={() => setConfirmDelete("bulk")}>
                      Delete
                    </BulkButton>
                  )}
                </div>
              ) : null}
              {pending ? <span className="text-sm text-muted">Updating…</span> : null}
            </div>
          ) : null}

          <ul className="grid gap-3">
            {visible.map((row) => (
              <li
                key={row.id}
                className={`rounded-2xl border bg-paper p-5 shadow-[0_8px_20px_rgba(26,29,27,0.05)] ${selected.has(row.id) ? "border-alpine" : "border-line"}`}
              >
                <div className="flex gap-4">
                  {canModerate ? (
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select comment from ${row.authorName}`}
                      className="mt-1 size-5 shrink-0 accent-alpine"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide uppercase ${STATUS_BADGE[row.status].className}`}>
                        {STATUS_BADGE[row.status].label}
                      </span>
                      {row.linkCount > 0 ? (
                        <span className="rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800">
                          {row.linkCount} link{row.linkCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {row.sameSourceRecent > 0 ? (
                        <span className="rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800" title="Same network address hash in the last 24 hours">
                          +{row.sameSourceRecent} from same network today
                        </span>
                      ) : null}
                      <span className="text-sm text-muted">{row.createdLabel}</span>
                    </div>
                    <p className="mt-2 text-base text-ink">
                      <strong className="font-semibold">{row.authorName}</strong>{" "}
                      <a href={`mailto:${row.authorEmail}`} className="text-sm break-all text-alpine-deep underline">
                        {row.authorEmail}
                      </a>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      On{" "}
                      {row.post.live ? (
                        <a href={`/blog/${row.post.slug}#comments`} target="_blank" rel="noopener noreferrer" className="font-semibold text-alpine-deep underline">
                          {row.post.title}
                        </a>
                      ) : (
                        <span className="font-semibold text-ink">{row.post.title} (not live)</span>
                      )}
                    </p>
                    <blockquote className="mt-3 rounded-xl border-l-4 border-line bg-canvas px-4 py-3 text-base leading-relaxed break-words whitespace-pre-line text-ink">
                      {row.body}
                    </blockquote>
                    {row.moderatedLabel ? (
                      <p className="mt-2 text-xs text-muted">
                        Last moderated {row.moderatedLabel}
                        {row.moderatorName ? ` by ${row.moderatorName}` : ""}
                      </p>
                    ) : null}
                    {canModerate ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {ROW_ACTIONS[row.status].map((item) =>
                          item.action === "delete" && confirmDelete === row.id ? (
                            <span key={item.action} className="flex flex-wrap gap-2">
                              <BulkButton tone="danger" disabled={pending} onClick={() => run([row.id], "delete")}>
                                Confirm delete
                              </BulkButton>
                              <BulkButton tone="plain" disabled={pending} onClick={() => setConfirmDelete(null)}>
                                Cancel
                              </BulkButton>
                            </span>
                          ) : (
                            <BulkButton
                              key={item.action}
                              tone={item.tone}
                              disabled={pending}
                              onClick={() => (item.action === "delete" ? setConfirmDelete(row.id) : run([row.id], item.action))}
                            >
                              {item.label}
                            </BulkButton>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function BulkButton({ tone, disabled, onClick, children }: { tone: "primary" | "plain" | "danger"; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold disabled:opacity-60 ${TONE[tone]}`}>
      {children}
    </button>
  )
}
