import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"
import type { ReactNode } from "react"
import { BlogCard, BlogLeadCard } from "@/components/blog/blog-card"
import { JsonLd } from "@/components/marketing/json-ld"
import { blogListHref, getBlogList, parseBlogFilters, type BlogListFilters } from "@/lib/blog"
import { getSiteUrl } from "@/lib/site"

export const revalidate = 60

const DESCRIPTION =
  "Route notes, acclimatization advice, riding skills, and gear lessons from Ice Age Expeditions' Himalayan 4x4 SUV and motorbike journeys in Ladakh, Spiti, and Zanskar."

export async function generateMetadata({ searchParams }: PageProps<"/blog">): Promise<Metadata> {
  const filters = parseBlogFilters(await searchParams)
  const filtered = Boolean(filters.q || filters.tag)
  return {
    title: filters.page > 1 ? `Journal · page ${filters.page}` : "Journal · Field notes from the high Himalaya",
    description: DESCRIPTION,
    alternates: {
      canonical: blogListHref({ category: filters.category, page: filters.page }),
      types: { "application/rss+xml": "/blog/rss.xml" },
    },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title: "Ice Age Expeditions journal", description: DESCRIPTION, type: "website" },
  }
}

export default async function BlogIndexPage({ searchParams }: PageProps<"/blog">) {
  const filters = parseBlogFilters(await searchParams)
  const list = await getBlogList(filters)
  const site = getSiteUrl()
  const activeCategory = list.categories.find((category) => category.slug === filters.category)
  const activeTag = list.tags.find((tag) => tag.slug === filters.tag)
  const filtered = Boolean(filters.q || filters.category || filters.tag)

  return (
    <div className="pb-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Ice Age Expeditions journal",
          description: DESCRIPTION,
          url: `${site}/blog`,
          blogPost: [...(list.lead ? [list.lead] : []), ...list.posts].map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${site}/blog/${post.slug}`,
            datePublished: post.publishedAtIso,
          })),
        }}
      />

      <header className="border-b border-line bg-paper">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-semibold tracking-wide text-alpine uppercase">Field notes</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight font-bold tracking-tight text-ink sm:text-5xl">
            The Era of Trails journal
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            Route notes, acclimatization habits, riding technique, and gear lessons from the road. Passes, permits, and
            road conditions change every season. Confirm the current picture with ops before you plan around anything
            you read here.
          </p>

          <Form action="/blog" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row" role="search" aria-label="Search the journal">
            {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
            {filters.tag ? <input type="hidden" name="tag" value={filters.tag} /> : null}
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <input
              id="blog-search"
              name="q"
              type="search"
              defaultValue={filters.q}
              maxLength={100}
              placeholder="Search: Khardung La, acclimatization, tyres…"
              className="min-h-12 flex-1 rounded-md border border-line bg-paper px-4 text-base text-ink placeholder:text-muted/80"
            />
            <button type="submit" className="min-h-12 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alpine">
              Search
            </button>
          </Form>

          {list.categories.length > 0 ? (
            <nav aria-label="Categories" className="mt-8">
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Chip href={blogListHref({ q: filters.q, tag: filters.tag })} active={!filters.category}>
                    All topics
                  </Chip>
                </li>
                {list.categories.map((category) => (
                  <li key={category.slug}>
                    <Chip href={blogListHref({ q: filters.q, tag: filters.tag, category: category.slug })} active={category.slug === filters.category}>
                      {category.name} <span className="opacity-75">({category.count})</span>
                    </Chip>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
        {list.status === "offline" ? (
          <div className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]" role="status">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">The journal is offline</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              We could not load articles just now. The safety, gear, and FAQ pages are still available. Retry this page in a moment.
            </p>
          </div>
        ) : (
          <>
            {filtered ? <FilterSummary filters={filters} total={list.total} categoryName={activeCategory?.name} tagName={activeTag?.name} /> : null}

            {list.lead ? (
              <div className="mb-12">
                <BlogLeadCard post={list.lead} />
              </div>
            ) : null}

            {list.posts.length > 0 ? (
              <section aria-label={filtered ? "Matching articles" : "Latest articles"}>
                {!filtered && list.lead ? <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Latest from the road</h2> : null}
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {list.posts.map((post) => (
                    <li key={post.id}>
                      <BlogCard post={post} headingLevel={!filtered && list.lead ? "h3" : "h2"} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : list.lead ? null : (
              <EmptyState filtered={filtered} />
            )}

            {list.pageCount > 1 ? <Pagination filters={filters} pageCount={list.pageCount} /> : null}

            {list.tags.length > 0 ? (
              <section aria-labelledby="tags-heading" className="mt-16 rounded-3xl border border-line bg-paper p-6 sm:p-8">
                <h2 id="tags-heading" className="font-display text-xl font-bold tracking-tight text-ink">
                  Browse by tag
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {list.tags.map((tag) => (
                    <li key={tag.slug}>
                      <Link
                        href={blogListHref({ tag: tag.slug === filters.tag ? "" : tag.slug, category: filters.category, q: filters.q })}
                        aria-current={tag.slug === filters.tag ? "true" : undefined}
                        className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${
                          tag.slug === filters.tag ? "border-alpine bg-alpine text-white" : "border-line text-ink hover:border-alpine hover:text-alpine-deep"
                        }`}
                      >
                        #{tag.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="mt-10 text-sm text-muted">
              Follow new articles in your feed reader:{" "}
              <a href="/blog/rss.xml" className="font-semibold text-alpine-deep underline underline-offset-4">
                RSS feed
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm font-semibold transition motion-reduce:transition-none ${
        active ? "border-alpine bg-alpine text-white" : "border-line bg-paper text-ink hover:border-alpine hover:text-alpine-deep"
      }`}
    >
      {children}
    </Link>
  )
}

function FilterSummary({ filters, total, categoryName, tagName }: { filters: BlogListFilters; total: number; categoryName?: string; tagName?: string }) {
  const parts = [
    filters.q ? `matching “${filters.q}”` : "",
    filters.category ? `in ${categoryName ?? filters.category}` : "",
    filters.tag ? `tagged #${tagName ?? filters.tag}` : "",
  ].filter(Boolean)
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper px-5 py-4">
      <p className="text-base text-ink" aria-live="polite">
        <strong className="font-semibold">{total}</strong> article{total === 1 ? "" : "s"} {parts.join(", ")}
      </p>
      <Link href="/blog" className="inline-flex min-h-11 items-center text-base font-semibold text-alpine-deep underline underline-offset-4">
        Clear filters
      </Link>
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-paper px-6 py-16 text-center">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">{filtered ? "No articles match" : "No articles yet"}</h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted">
        {filtered
          ? "Try a shorter search, another topic, or clear the filters."
          : "The first field notes are being written. Meanwhile, the route pages carry the day-by-day plans."}
      </p>
      <Link
        href={filtered ? "/blog" : "/expeditions"}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep"
      >
        {filtered ? "Clear filters" : "Browse expeditions"}
      </Link>
    </div>
  )
}

function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push("gap")
    out.push(page)
  })
  return out
}

function Pagination({ filters, pageCount }: { filters: BlogListFilters; pageCount: number }) {
  const current = Math.min(filters.page, pageCount)
  const base = { q: filters.q, category: filters.category, tag: filters.tag }
  const linkClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-base font-semibold"
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {current > 1 ? (
        <Link href={blogListHref({ ...base, page: current - 1 })} rel="prev" className={`${linkClass} border-line bg-paper text-ink hover:border-alpine`}>
          ← Newer
        </Link>
      ) : null}
      {pageWindow(current, pageCount).map((page, index) =>
        page === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={blogListHref({ ...base, page })}
            aria-current={page === current ? "page" : undefined}
            aria-label={`Page ${page}`}
            className={`${linkClass} ${page === current ? "border-alpine bg-alpine text-white" : "border-line bg-paper text-ink hover:border-alpine"}`}
          >
            {page}
          </Link>
        ),
      )}
      {current < pageCount ? (
        <Link href={blogListHref({ ...base, page: current + 1 })} rel="next" className={`${linkClass} border-line bg-paper text-ink hover:border-alpine`}>
          Older →
        </Link>
      ) : null}
    </nav>
  )
}
