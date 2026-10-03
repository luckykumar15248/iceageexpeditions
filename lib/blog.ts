/**
 * Public blog read path. Everything here returns only PUBLISHED posts whose publishedAt has passed,
 * and only APPROVED comments. Results are cached under the "blog" tag; ops mutations call updateTag.
 */
import { cache } from "react"
import { unstable_cache } from "next/cache"
import { z } from "zod"
import { BlogCommentStatus, BlogPostStatus, type Prisma } from "@/app/generated/prisma/client"
import { getPrisma } from "@/lib/db"

export const BLOG_CACHE_TAG = "blog"
export const BLOG_PAGE_SIZE = 9
const BLOG_CACHE = { revalidate: 60, tags: [BLOG_CACHE_TAG] }

export type BlogTaxonomy = { name: string; slug: string }
export type BlogTaxonomyCount = BlogTaxonomy & { count: number }

export type BlogCard = {
  id: string
  slug: string
  title: string
  excerpt: string
  publishedAtIso: string
  readingMinutes: number
  featuredImageUrl: string | null
  featuredImageAlt: string
  category: BlogTaxonomy | null
  tags: BlogTaxonomy[]
  authorName: string
  commentCount: number
}

export type PublicComment = {
  id: string
  authorName: string
  body: string
  createdAtIso: string
}

export type BlogPostDetail = BlogCard & {
  body: string
  updatedAtIso: string
  metaTitle: string | null
  metaDescription: string | null
  robotsIndex: boolean
  commentsEnabled: boolean
  comments: PublicComment[]
  related: BlogCard[]
}

export type BlogListFilters = { q: string; category: string; tag: string; page: number }

export type BlogListPayload = {
  status: "ok" | "offline"
  filters: BlogListFilters
  lead: BlogCard | null
  posts: BlogCard[]
  total: number
  pageCount: number
  categories: BlogTaxonomyCount[]
  tags: BlogTaxonomyCount[]
}

type SearchValue = string | string[] | undefined

const slugParam = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,100}$/)
const postSlugParam = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,160}$/)
const pageParam = z.coerce.number().int().min(1).max(1000)

function first(value: SearchValue): string {
  return (Array.isArray(value) ? value[0] : value) ?? ""
}

export function parseBlogFilters(input: { q?: SearchValue; category?: SearchValue; tag?: SearchValue; page?: SearchValue }): BlogListFilters {
  const category = slugParam.safeParse(first(input.category))
  const tag = slugParam.safeParse(first(input.tag))
  const page = pageParam.safeParse(first(input.page) || "1")
  return {
    q: first(input.q).replace(/\s+/g, " ").trim().slice(0, 100),
    category: category.success ? category.data : "",
    tag: tag.success ? tag.data : "",
    page: page.success ? page.data : 1,
  }
}

export function blogListHref(filters: Partial<BlogListFilters>): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.category) params.set("category", filters.category)
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  const query = params.toString()
  return query ? `/blog?${query}` : "/blog"
}

function livePostWhere(now: Date): Prisma.BlogPostWhereInput {
  return { status: BlogPostStatus.PUBLISHED, publishedAt: { lte: now } }
}

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  readingMinutes: true,
  featuredImageUrl: true,
  featuredImageAlt: true,
  category: { select: { name: true, slug: true } },
  tags: { select: { tag: { select: { name: true, slug: true } } } },
  author: { select: { name: true } },
  _count: { select: { comments: { where: { status: BlogCommentStatus.APPROVED } } } },
} satisfies Prisma.BlogPostSelect

type CardRow = Prisma.BlogPostGetPayload<{ select: typeof cardSelect }>

function toCard(row: CardRow): BlogCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    publishedAtIso: (row.publishedAt ?? new Date(0)).toISOString(),
    readingMinutes: row.readingMinutes,
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt?.trim() || row.title,
    category: row.category,
    tags: row.tags.map((link) => link.tag).sort((a, b) => a.name.localeCompare(b.name)),
    authorName: row.author.name,
    commentCount: row._count.comments,
  }
}

async function readPublic<T>(work: () => Promise<T>): Promise<T | "offline"> {
  try {
    return await work()
  } catch (error) {
    console.error("[blog] public read failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return "offline"
  }
}

function searchWhere(q: string): Prisma.BlogPostWhereInput[] {
  return q
    .split(" ")
    .filter((term) => term.length > 0)
    .slice(0, 5)
    .map((term) => ({
      OR: [{ title: { contains: term } }, { excerpt: { contains: term } }, { body: { contains: term } }],
    }))
}

const loadBlogList = unstable_cache(
  async (key: string): Promise<BlogListPayload> => {
    const filters = JSON.parse(key) as BlogListFilters
    const now = new Date()
    const live = livePostWhere(now)
    const unfiltered = !filters.q && !filters.category && !filters.tag

    const result = await readPublic(async () => {
      const prisma = getPrisma()
      const leadRow = unfiltered
        ? await prisma.blogPost.findFirst({
            where: { ...live, featured: true },
            orderBy: { publishedAt: "desc" },
            select: cardSelect,
          })
        : null

      const where: Prisma.BlogPostWhereInput = {
        AND: [
          live,
          ...searchWhere(filters.q),
          ...(filters.category ? [{ category: { slug: filters.category } }] : []),
          ...(filters.tag ? [{ tags: { some: { tag: { slug: filters.tag } } } }] : []),
          ...(leadRow ? [{ id: { not: leadRow.id } }] : []),
        ],
      }

      const [total, rows, categoryRows, tagRows] = await Promise.all([
        prisma.blogPost.count({ where }),
        prisma.blogPost.findMany({
          where,
          orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
          skip: (filters.page - 1) * BLOG_PAGE_SIZE,
          take: BLOG_PAGE_SIZE,
          select: cardSelect,
        }),
        prisma.blogCategory.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true, slug: true, _count: { select: { posts: { where: live } } } },
        }),
        prisma.blogTag.findMany({
          where: { posts: { some: { post: live } } },
          select: { name: true, slug: true, _count: { select: { posts: { where: { post: live } } } } },
        }),
      ])

      return {
        lead: leadRow && filters.page === 1 ? toCard(leadRow) : null,
        posts: rows.map(toCard),
        total,
        categories: categoryRows
          .map((row) => ({ name: row.name, slug: row.slug, count: row._count.posts }))
          .filter((row) => row.count > 0 || row.slug === filters.category),
        tags: tagRows
          .map((row) => ({ name: row.name, slug: row.slug, count: row._count.posts }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
          .slice(0, 16),
      }
    })

    if (result === "offline") {
      return { status: "offline", filters, lead: null, posts: [], total: 0, pageCount: 0, categories: [], tags: [] }
    }
    return {
      status: "ok",
      filters,
      ...result,
      pageCount: Math.max(1, Math.ceil(result.total / BLOG_PAGE_SIZE)),
    }
  },
  ["blog-list"],
  BLOG_CACHE,
)

export const getBlogList = cache(async (filters: BlogListFilters): Promise<BlogListPayload> => {
  return loadBlogList(JSON.stringify({ q: filters.q, category: filters.category, tag: filters.tag, page: filters.page }))
})

const loadBlogPost = unstable_cache(
  async (slug: string): Promise<BlogPostDetail | "offline" | null> => {
    const now = new Date()
    const live = livePostWhere(now)
    const result = await readPublic(async () => {
      const prisma = getPrisma()
      const row = await prisma.blogPost.findFirst({
        where: { ...live, slug },
        select: {
          ...cardSelect,
          body: true,
          updatedAt: true,
          metaTitle: true,
          metaDescription: true,
          robotsIndex: true,
          commentsEnabled: true,
          categoryId: true,
          comments: {
            where: { status: BlogCommentStatus.APPROVED },
            orderBy: { createdAt: "asc" },
            take: 500,
            select: { id: true, authorName: true, body: true, createdAt: true },
          },
        },
      })
      if (!row) return null

      const sameCategory = row.categoryId
        ? await prisma.blogPost.findMany({
            where: { ...live, categoryId: row.categoryId, id: { not: row.id } },
            orderBy: { publishedAt: "desc" },
            take: 3,
            select: cardSelect,
          })
        : []
      const fill =
        sameCategory.length < 3
          ? await prisma.blogPost.findMany({
              where: { ...live, id: { notIn: [row.id, ...sameCategory.map((post) => post.id)] } },
              orderBy: { publishedAt: "desc" },
              take: 3 - sameCategory.length,
              select: cardSelect,
            })
          : []
      return { row, related: [...sameCategory, ...fill] }
    })

    if (result === "offline") return "offline"
    if (!result) return null
    const { row, related } = result
    return {
      ...toCard(row),
      body: row.body,
      updatedAtIso: row.updatedAt.toISOString(),
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      robotsIndex: row.robotsIndex,
      commentsEnabled: row.commentsEnabled,
      comments: row.comments.map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        createdAtIso: comment.createdAt.toISOString(),
      })),
      related: related.map(toCard),
    }
  },
  ["blog-post"],
  BLOG_CACHE,
)

export const getBlogPost = cache(async (slug: string): Promise<BlogPostDetail | "offline" | null> => {
  const parsed = postSlugParam.safeParse(slug)
  if (!parsed.success) return null
  return loadBlogPost(parsed.data)
})

export type BlogFeedItem = {
  slug: string
  title: string
  excerpt: string
  categoryName: string | null
  publishedAtIso: string
  updatedAtIso: string
  robotsIndex: boolean
}

const loadBlogFeed = unstable_cache(
  async (): Promise<BlogFeedItem[]> => {
    const result = await readPublic(async () => {
      return getPrisma().blogPost.findMany({
        where: livePostWhere(new Date()),
        orderBy: { publishedAt: "desc" },
        take: 1000,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          publishedAt: true,
          updatedAt: true,
          robotsIndex: true,
          category: { select: { name: true } },
        },
      })
    })
    if (result === "offline") return []
    return result.map((row) => ({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      categoryName: row.category?.name ?? null,
      publishedAtIso: (row.publishedAt ?? row.updatedAt).toISOString(),
      updatedAtIso: row.updatedAt.toISOString(),
      robotsIndex: row.robotsIndex,
    }))
  },
  ["blog-feed"],
  BLOG_CACHE,
)

/** Live posts for the sitemap and RSS feed, newest first. */
export const listBlogFeed = cache(async () => loadBlogFeed())

export function formatBlogDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso))
}
