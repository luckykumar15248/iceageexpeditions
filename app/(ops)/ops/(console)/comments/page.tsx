import Link from "next/link"
import { CommentQueue, type QueueRow } from "@/components/ops/blog/comment-queue"
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { loadCommentQueue, parseCommentFilter, parsePage, type CommentFilter } from "@/lib/blog-admin"
import { formatIstDateTime } from "@/lib/format"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, staffHasPermission } from "@/lib/staff"

export const metadata = {
  title: "Comments · Ops · Ice Age Expeditions",
  robots: { index: false },
}

const TABS: { value: CommentFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "spam", label: "Spam" },
  { value: "all", label: "All" },
]

function queueHref(filter: CommentFilter, q: string, page = 1): string {
  const params = new URLSearchParams()
  if (filter !== "pending") params.set("status", filter)
  if (q) params.set("q", q)
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return query ? `/ops/comments?${query}` : "/ops/comments"
}

export default async function CommentsPage({ searchParams }: PageProps<"/ops/comments">) {
  const staff = await requireOpsStaff()
  const canModerate = staffHasPermission(staff.role, StaffPermission.commentModerate)
  const params = await searchParams
  const filter = parseCommentFilter(typeof params.status === "string" ? params.status : undefined)
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100)
  const page = parsePage(params.page)
  const queue = await loadCommentQueue({ filter, q, page })

  const rows: QueueRow[] =
    queue === "offline"
      ? []
      : queue.rows.map((row) => ({
          id: row.id,
          status: row.status,
          authorName: row.authorName,
          authorEmail: row.authorEmail,
          body: row.body,
          createdLabel: formatIstDateTime(row.createdAt),
          moderatedLabel: row.moderatedAt ? formatIstDateTime(row.moderatedAt) : null,
          moderatorName: row.moderatorName,
          linkCount: row.linkCount,
          sameSourceRecent: row.sameSourceRecent,
          post: row.post,
        }))

  return (
    <div>
      <OpsHeading
        kicker="Blog"
        title="Comment moderation"
        body="Reader comments stay hidden until approved. Approving publishes the comment on the live post immediately. Commenter emails are for private replies only and never appear on the site."
      />

      {queue === "offline" ? (
        <OpsOffline />
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Comment status">
              <ul className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <li key={tab.value}>
                    <Link
                      href={queueHref(tab.value, q)}
                      aria-current={tab.value === filter ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
                        tab.value === filter ? "border-alpine bg-alpine text-white" : "border-line bg-paper text-ink hover:border-alpine"
                      }`}
                    >
                      {tab.label}
                      <span className="opacity-75">{queue.counts[tab.value]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <form action="/ops/comments" className="flex gap-2" role="search">
              {filter !== "pending" ? <input type="hidden" name="status" value={filter} /> : null}
              <label htmlFor="ops-comments-q" className="sr-only">
                Search comments
              </label>
              <input
                id="ops-comments-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Name, email, text, or post"
                className="min-h-11 w-64 rounded-md border border-line bg-paper px-3 text-base text-ink"
              />
              <button type="submit" className="min-h-11 rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink hover:border-alpine">
                Search
              </button>
            </form>
          </div>

          {!canModerate ? (
            <p className="mt-6 rounded-2xl border border-line bg-paper px-5 py-4 text-base text-muted">
              This desk role can read the queue but cannot approve, mark spam, or delete comments.
            </p>
          ) : null}

          <div className="mt-6">
            <CommentQueue rows={rows} filter={filter} canModerate={canModerate} />
          </div>

          {queue.pageCount > 1 ? (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
              {page > 1 ? (
                <Link href={queueHref(filter, q, page - 1)} className="inline-flex min-h-11 items-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Page {page} of {queue.pageCount} · {queue.total} comment{queue.total === 1 ? "" : "s"}
              </span>
              {page < queue.pageCount ? (
                <Link href={queueHref(filter, q, page + 1)} className="inline-flex min-h-11 items-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
