import Link from "next/link"
import { ExpeditionImage } from "@/components/expedition-image"
import { formatBlogDate, type BlogCard as BlogCardData } from "@/lib/blog"

function CardImage({ post, sizes, preload }: { post: BlogCardData; sizes: string; preload?: boolean }) {
  if (!post.featuredImageUrl) {
    return (
      <div className="flex h-full w-full items-end bg-gradient-to-br from-alpine-soft via-canvas to-line p-6" aria-hidden="true">
        <span className="font-display text-sm font-bold tracking-[0.18em] text-alpine-deep/70 uppercase">
          {post.category?.name ?? "Field notes"}
        </span>
      </div>
    )
  }
  return <ExpeditionImage src={post.featuredImageUrl} alt={post.featuredImageAlt} fill sizes={sizes} preload={preload} className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
}

function Meta({ post }: { post: BlogCardData }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      <time dateTime={post.publishedAtIso}>{formatBlogDate(post.publishedAtIso)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min read</span>
      {post.commentCount > 0 ? (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
          </span>
        </>
      ) : null}
    </p>
  )
}

export function BlogCard({ post, headingLevel = "h2" }: { post: BlogCardData; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition hover:shadow-[0_18px_44px_rgba(26,29,27,0.12)] focus-within:ring-2 focus-within:ring-alpine motion-reduce:transition-none">
      <div className="relative aspect-[16/10] overflow-hidden bg-line">
        <CardImage post={post} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.category ? <p className="text-sm font-semibold tracking-wide text-alpine uppercase">{post.category.name}</p> : null}
        <Heading className="mt-2 font-display text-xl leading-snug font-bold tracking-tight text-ink">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </Heading>
        <p className="mt-3 line-clamp-3 flex-1 text-base leading-relaxed text-muted">{post.excerpt}</p>
        <div className="mt-5">
          <Meta post={post} />
        </div>
      </div>
    </article>
  )
}

export function BlogLeadCard({ post }: { post: BlogCardData }) {
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_18px_50px_rgba(26,29,27,0.08)] focus-within:ring-2 focus-within:ring-alpine lg:grid-cols-[1.4fr_1fr]">
      <div className="relative aspect-[16/10] overflow-hidden bg-line lg:aspect-auto lg:min-h-[24rem]">
        <CardImage post={post} sizes="(max-width: 1024px) 100vw, 60vw" preload />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-alpine uppercase">
          Featured{post.category ? ` · ${post.category.name}` : ""}
        </p>
        <h2 className="mt-3 font-display text-2xl leading-tight font-bold tracking-tight text-ink sm:text-3xl">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">{post.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Meta post={post} />
          <span className="inline-flex min-h-11 items-center rounded-md bg-alpine px-5 text-base font-medium text-white group-hover:bg-alpine-deep">
            Read the story
          </span>
        </div>
      </div>
    </article>
  )
}
