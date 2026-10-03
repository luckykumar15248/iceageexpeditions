import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BlogCard } from "@/components/blog/blog-card"
import { CommentForm } from "@/components/blog/comment-form"
import { ShareLinks } from "@/components/blog/share-links"
import { ExpeditionImage } from "@/components/expedition-image"
import { JsonLd } from "@/components/marketing/json-ld"
import { blogListHref, formatBlogDate, getBlogPost, type PublicComment } from "@/lib/blog"
import { metaDescription } from "@/lib/format"
import { renderMarkdown, type MarkdownHeading } from "@/lib/markdown"
import { getSiteUrl } from "@/lib/site"

export const revalidate = 60

function absolute(site: string, url: string): string {
  return url.startsWith("/") ? `${site}${url}` : url
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (post === "offline") return { title: "Journal offline" }
  if (!post) return { title: "Article not found", robots: { index: false } }
  const title = post.metaTitle?.trim() || post.title
  const description = post.metaDescription?.trim() || metaDescription(post.excerpt)
  const images = post.featuredImageUrl ? [{ url: post.featuredImageUrl, alt: post.featuredImageAlt }] : undefined
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: { index: post.robotsIndex, follow: true },
    authors: [{ name: post.authorName }],
    keywords: post.tags.map((tag) => tag.name),
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAtIso,
      modifiedTime: post.updatedAtIso,
      section: post.category?.name,
      tags: post.tags.map((tag) => tag.name),
      images,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((image) => image.url) },
  }
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (post === "offline") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]" role="status">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">This article could not be loaded</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">The journal is offline for a moment. Retry this page shortly.</p>
        </div>
      </div>
    )
  }
  if (!post) notFound()

  const site = getSiteUrl()
  const url = `${site}/blog/${post.slug}`
  const { content, headings } = renderMarkdown(post.body)
  const updatedLater = new Date(post.updatedAtIso).getTime() - new Date(post.publishedAtIso).getTime() > 24 * 60 * 60 * 1000

  return (
    <article className="bg-paper pb-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.metaDescription?.trim() || post.excerpt,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          datePublished: post.publishedAtIso,
          dateModified: post.updatedAtIso,
          wordCount: post.body.split(/\s+/).filter(Boolean).length,
          timeRequired: `PT${post.readingMinutes}M`,
          ...(post.featuredImageUrl ? { image: [absolute(site, post.featuredImageUrl)] } : {}),
          ...(post.category ? { articleSection: post.category.name } : {}),
          ...(post.tags.length > 0 ? { keywords: post.tags.map((tag) => tag.name).join(", ") } : {}),
          author: { "@type": "Person", name: post.authorName },
          publisher: { "@type": "Organization", name: "Ice Age Expeditions", url: site },
          commentCount: post.commentCount,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: site },
            { "@type": "ListItem", position: 2, name: "Journal", item: `${site}/blog` },
            ...(post.category
              ? [{ "@type": "ListItem", position: 3, name: post.category.name, item: `${site}${blogListHref({ category: post.category.slug })}` }]
              : []),
            { "@type": "ListItem", position: post.category ? 4 : 3, name: post.title, item: url },
          ],
        }}
      />

      <header className="bg-paper">
        <div className="mx-auto w-full max-w-3xl px-4 pt-10 pb-2 sm:px-6 sm:pt-14">
          <nav aria-label="Breadcrumb" className="text-sm leading-relaxed text-muted">
            <Link href="/" className="font-semibold text-alpine-deep hover:underline">
              Home
            </Link>
            <span aria-hidden="true"> / </span>
            <Link href="/blog" className="font-semibold text-alpine-deep hover:underline">
              Journal
            </Link>
            {post.category ? (
              <>
                <span aria-hidden="true"> / </span>
                <Link href={blogListHref({ category: post.category.slug })} className="font-semibold text-alpine-deep hover:underline">
                  {post.category.name}
                </Link>
              </>
            ) : null}
          </nav>
          <h1 className="mt-6 font-display text-3xl leading-tight font-bold tracking-tight text-ink sm:text-5xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted sm:text-xl">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-alpine-soft font-display text-sm font-bold text-alpine-deep" aria-hidden="true">
                {post.authorName.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-semibold text-ink">{post.authorName}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Published <time dateTime={post.publishedAtIso}>{formatBlogDate(post.publishedAtIso)}</time>
            </span>
            {updatedLater ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated <time dateTime={post.updatedAtIso}>{formatBlogDate(post.updatedAtIso)}</time>
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
        </div>
      </header>

      {post.featuredImageUrl ? (
        <figure className="mx-auto mt-8 w-full max-w-5xl px-4 sm:px-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line bg-line">
            <ExpeditionImage src={post.featuredImageUrl} alt={post.featuredImageAlt} fill preload sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
          </div>
        </figure>
      ) : null}

      <div className="mx-auto mt-10 grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="mx-auto w-full max-w-3xl min-w-0">
          {headings.length >= 2 ? <MobileContents headings={headings} /> : null}

          {content}

          {post.tags.length > 0 ? (
            <div className="mt-12 border-t border-line pt-6">
              <h2 className="sr-only">Tags</h2>
              <ul className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Link
                      href={blogListHref({ tag: tag.slug })}
                      className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-alpine hover:text-alpine-deep"
                    >
                      #{tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <section aria-labelledby="share-heading" className="mt-10">
            <h2 id="share-heading" className="font-display text-lg font-bold tracking-tight text-ink">
              Share this article
            </h2>
            <div className="mt-3">
              <ShareLinks url={url} title={post.title} />
            </div>
          </section>

          <aside className="mt-12 rounded-3xl border border-alpine/30 bg-alpine-soft p-6 sm:p-8" aria-labelledby="plan-heading">
            <h2 id="plan-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Planning a Himalayan ride or drive?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink">
              Every departure lists its acclimatization days, support-vehicle coverage, and permit notes. Ops confirms
              road and permit status for your dates before you pay a deposit.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/expeditions" className="inline-flex min-h-12 items-center rounded-md bg-alpine px-5 text-base font-medium text-white hover:bg-alpine-deep">
                See expeditions
              </Link>
              <Link href="/enquire" className="inline-flex min-h-12 items-center rounded-md border border-alpine bg-paper px-5 text-base font-medium text-alpine-deep hover:bg-canvas">
                Ask ops a question
              </Link>
            </div>
          </aside>

          <section id="comments" aria-labelledby="comments-heading" className="mt-16 scroll-mt-28">
            <h2 id="comments-heading" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {post.comments.length > 0 ? `${post.comments.length} comment${post.comments.length === 1 ? "" : "s"}` : "Comments"}
            </h2>
            {post.comments.length > 0 ? (
              <ol className="mt-6 grid gap-4">
                {post.comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-base text-muted">{post.commentsEnabled ? "No comments yet. Start the conversation." : "There are no comments on this article."}</p>
            )}
            <div className="mt-8">
              {post.commentsEnabled ? (
                <CommentForm postId={post.id} />
              ) : (
                <p className="rounded-2xl border border-line bg-paper px-5 py-4 text-base text-muted">Comments are closed on this article.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="hidden lg:block" aria-label="Article tools">
          <div className="sticky top-28 grid gap-8">
            {headings.length >= 2 ? (
              <nav aria-labelledby="toc-heading">
                <h2 id="toc-heading" className="text-sm font-semibold tracking-wide text-alpine uppercase">
                  On this page
                </h2>
                <ContentsList headings={headings} />
              </nav>
            ) : null}
            <a href="#comments" className="text-sm font-semibold text-alpine-deep underline underline-offset-4">
              Jump to comments ({post.comments.length})
            </a>
          </div>
        </aside>
      </div>

      {post.related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mx-auto mt-20 w-full max-w-7xl px-4 sm:px-6">
          <h2 id="related-heading" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Keep reading
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {post.related.map((related) => (
              <li key={related.id}>
                <BlogCard post={related} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

function ContentsList({ headings }: { headings: MarkdownHeading[] }) {
  return (
    <ol className="mt-3 grid gap-1 border-l border-line">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={`-ml-px block border-l-2 border-transparent py-1.5 text-sm leading-snug text-muted hover:border-alpine hover:text-ink ${heading.level === 3 ? "pl-7" : "pl-4"}`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  )
}

function MobileContents({ headings }: { headings: MarkdownHeading[] }) {
  return (
    <details className="mb-8 rounded-2xl border border-line bg-paper px-5 py-1 lg:hidden">
      <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-ink">On this page</summary>
      <nav aria-label="On this page" className="pb-4">
        <ContentsList headings={headings} />
      </nav>
    </details>
  )
}

function CommentItem({ comment }: { comment: PublicComment }) {
  return (
    <li className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas font-display text-base font-bold text-ink" aria-hidden="true">
          {comment.authorName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="text-base font-semibold text-ink">{comment.authorName}</p>
          <p className="text-sm text-muted">
            <time dateTime={comment.createdAtIso}>{formatBlogDate(comment.createdAtIso)}</time>
          </p>
        </div>
      </div>
      <p className="mt-3 text-base leading-relaxed break-words whitespace-pre-line text-ink">{comment.body}</p>
    </li>
  )
}
