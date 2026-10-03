import Link from "next/link"
import { DeletePostButton } from "@/components/ops/blog/delete-post-button"
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { loadOpsBlogPosts, parsePage, parsePostFilter, type OpsPostFilter, type OpsPostState } from "@/lib/blog-admin"
import { formatIstDateTime } from "@/lib/format"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, staffHasPermission } from "@/lib/staff"

export const metadata = {
  title: "Blog posts · Ops · Ice Age Expeditions",
  robots: { index: false },
}

const TABS: { value: OpsPostFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Drafts" },
]

const STATE_BADGE: Record<OpsPostState, { label: string; className: string }> = {
  published: { label: "Published", className: "bg-alpine-soft text-alpine-deep" },
  scheduled: { label: "Scheduled", className: "bg-amber-50 text-amber-800" },
  draft: { label: "Draft", className: "bg-canvas text-muted" },
}

function listHref(filter: OpsPostFilter, q: string, page = 1): string {
  const params = new URLSearchParams()
  if (filter !== "all") params.set("status", filter)
  if (q) params.set("q", q)
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return query ? `/ops/blog?${query}` : "/ops/blog"
}

export default async function OpsBlogPage({ searchParams }: PageProps<"/ops/blog">) {
  const staff = await requireOpsStaff()
  const canWrite = staffHasPermission(staff.role, StaffPermission.blogWrite)
  const params = await searchParams
  const filter = parsePostFilter(typeof params.status === "string" ? params.status : undefined)
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100)
  const page = parsePage(params.page)
  const list = await loadOpsBlogPosts({ filter, q, page })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <OpsHeading
          kicker="Content"
          title="Blog posts"
          body="Write, schedule, and publish journal articles. Scheduled posts go live automatically at their publish time. Facts about roads, permits, and altitude must match what ops can stand behind."
        />
        {canWrite ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/ops/blog/categories" className="inline-flex min-h-12 items-center rounded-md border border-line bg-paper px-5 text-base font-medium text-ink hover:border-alpine">
              Categories
            </Link>
            <Link href="/ops/blog/new" className="inline-flex min-h-12 items-center rounded-md bg-alpine px-5 text-base font-semibold text-white hover:bg-alpine-deep">
              New post
            </Link>
          </div>
        ) : null}
      </div>

      {list === "offline" ? (
        <OpsOffline />
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Post status">
              <ul className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <li key={tab.value}>
                    <Link
                      href={listHref(tab.value, q)}
                      aria-current={tab.value === filter ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
                        tab.value === filter ? "border-alpine bg-alpine text-white" : "border-line bg-paper text-ink hover:border-alpine"
                      }`}
                    >
                      {tab.label}
                      <span className="opacity-75">{list.counts[tab.value]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <form action="/ops/blog" className="flex gap-2" role="search">
              {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
              <label htmlFor="ops-blog-q" className="sr-only">
                Search posts
              </label>
              <input
                id="ops-blog-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Title or slug"
                className="min-h-11 w-56 rounded-md border border-line bg-paper px-3 text-base text-ink"
              />
              <button type="submit" className="min-h-11 rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink hover:border-alpine">
                Search
              </button>
            </form>
          </div>

          {list.rows.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-line bg-paper px-6 py-14 text-center">
              <h2 className="font-display text-xl font-bold text-ink">{q || filter !== "all" ? "No posts match" : "No posts yet"}</h2>
              <p className="mt-2 text-base text-muted">
                {q || filter !== "all" ? "Try another tab or clear the search." : "Start with a route guide or an acclimatization explainer."}
              </p>
              {canWrite && !q && filter === "all" ? (
                <Link href="/ops/blog/new" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-alpine px-5 text-base font-semibold text-white">
                  Write the first post
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="mt-6 grid gap-3">
              {list.rows.map((row) => (
                <li key={row.id} className="rounded-2xl border border-line bg-paper p-5 shadow-[0_8px_20px_rgba(26,29,27,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide uppercase ${STATE_BADGE[row.state].className}`}>
                          {STATE_BADGE[row.state].label}
                        </span>
                        {row.featured ? <span className="rounded-full bg-ink px-3 py-0.5 text-xs font-semibold tracking-wide text-white uppercase">Featured</span> : null}
                        {row.categoryName ? <span className="text-sm text-muted">{row.categoryName}</span> : null}
                      </div>
                      <h2 className="mt-2 font-display text-lg font-bold text-ink">
                        <Link href={`/ops/blog/${row.id}`} className="hover:text-alpine-deep hover:underline">
                          {row.title}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm break-all text-muted">/blog/{row.slug}</p>
                      <p className="mt-2 text-sm text-muted">
                        {row.state === "draft"
                          ? `Last edited ${formatIstDateTime(row.updatedAt)}`
                          : `${row.state === "scheduled" ? "Goes live" : "Published"} ${row.publishedAt ? formatIstDateTime(row.publishedAt) : ""}`}{" "}
                        · {row.authorName} · {row.approvedComments} approved comment{row.approvedComments === 1 ? "" : "s"}
                        {row.pendingComments > 0 ? (
                          <>
                            {" · "}
                            <Link href="/ops/comments" className="font-semibold text-alpine-deep underline">
                              {row.pendingComments} pending
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.state === "published" ? (
                        <a href={`/blog/${row.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:border-alpine">
                          View live
                        </a>
                      ) : null}
                      {canWrite ? (
                        <>
                          <Link href={`/ops/blog/${row.id}`} className="inline-flex min-h-11 items-center rounded-md bg-alpine px-4 text-sm font-semibold text-white hover:bg-alpine-deep">
                            Edit
                          </Link>
                          <DeletePostButton id={row.id} title={row.title} />
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {list.pageCount > 1 ? (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
              {page > 1 ? (
                <Link href={listHref(filter, q, page - 1)} className="inline-flex min-h-11 items-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Page {page} of {list.pageCount}
              </span>
              {page < list.pageCount ? (
                <Link href={listHref(filter, q, page + 1)} className="inline-flex min-h-11 items-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink">
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
