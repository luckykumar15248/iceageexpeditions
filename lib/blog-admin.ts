/**
 * Ops console read path for the blog and the comment moderation queue. Never cached:
 * staff need to see their own edits and new comments immediately.
 */
import { BlogCommentStatus, BlogPostStatus, type Prisma } from "@/app/generated/prisma/client"
import type { BlogPostInput } from "@/lib/blog-schema"
import { getPrisma } from "@/lib/db"

export type OpsPostState = "draft" | "scheduled" | "published"
export type OpsPostFilter = "all" | OpsPostState

export const OPS_POST_PAGE_SIZE = 20
export const OPS_COMMENT_PAGE_SIZE = 25

export function postState(status: BlogPostStatus, publishedAt: Date | null, now = new Date()): OpsPostState {
  if (status === BlogPostStatus.DRAFT) return "draft"
  return publishedAt && publishedAt > now ? "scheduled" : "published"
}

function stateWhere(filter: OpsPostFilter, now: Date): Prisma.BlogPostWhereInput {
  switch (filter) {
    case "draft":
      return { status: BlogPostStatus.DRAFT }
    case "scheduled":
      return { status: BlogPostStatus.PUBLISHED, publishedAt: { gt: now } }
    case "published":
      return { status: BlogPostStatus.PUBLISHED, publishedAt: { lte: now } }
    case "all":
      return {}
  }
}

export function parsePostFilter(value: string | undefined): OpsPostFilter {
  return value === "draft" || value === "scheduled" || value === "published" ? value : "all"
}

export type OpsPostRow = {
  id: string
  title: string
  slug: string
  state: OpsPostState
  publishedAt: Date | null
  updatedAt: Date
  categoryName: string | null
  authorName: string
  featured: boolean
  pendingComments: number
  approvedComments: number
}

export type OpsPostList = {
  rows: OpsPostRow[]
  total: number
  pageCount: number
  counts: Record<OpsPostFilter, number>
}

export async function loadOpsBlogPosts(input: { filter: OpsPostFilter; q: string; page: number }): Promise<OpsPostList | "offline"> {
  const now = new Date()
  const q = input.q.trim().slice(0, 100)
  const search: Prisma.BlogPostWhereInput = q ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] } : {}
  const where: Prisma.BlogPostWhereInput = { AND: [stateWhere(input.filter, now), search] }
  try {
    const prisma = getPrisma()
    const [rows, total, all, draft, scheduled, published] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: (input.page - 1) * OPS_POST_PAGE_SIZE,
        take: OPS_POST_PAGE_SIZE,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          featured: true,
          category: { select: { name: true } },
          author: { select: { name: true } },
          comments: { where: { status: { in: [BlogCommentStatus.PENDING, BlogCommentStatus.APPROVED] } }, select: { status: true } },
        },
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost.count({ where: search }),
      prisma.blogPost.count({ where: { AND: [stateWhere("draft", now), search] } }),
      prisma.blogPost.count({ where: { AND: [stateWhere("scheduled", now), search] } }),
      prisma.blogPost.count({ where: { AND: [stateWhere("published", now), search] } }),
    ])
    return {
      rows: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        state: postState(row.status, row.publishedAt, now),
        publishedAt: row.publishedAt,
        updatedAt: row.updatedAt,
        categoryName: row.category?.name ?? null,
        authorName: row.author.name,
        featured: row.featured,
        pendingComments: row.comments.filter((comment) => comment.status === BlogCommentStatus.PENDING).length,
        approvedComments: row.comments.filter((comment) => comment.status === BlogCommentStatus.APPROVED).length,
      })),
      total,
      pageCount: Math.max(1, Math.ceil(total / OPS_POST_PAGE_SIZE)),
      counts: { all, draft, scheduled, published },
    }
  } catch (error) {
    console.error("[blog] ops post list failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return "offline"
  }
}

export type OpsPostEditor = {
  input: BlogPostInput
  state: OpsPostState
  publishedAtIso: string | null
  createdAt: Date
  updatedAt: Date
  authorName: string
  pendingComments: number
}

export async function loadOpsBlogPost(id: string): Promise<OpsPostEditor | "offline" | null> {
  if (!id || id.length > 40) return null
  try {
    const row = await getPrisma().blogPost.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        author: { select: { name: true } },
        _count: { select: { comments: { where: { status: BlogCommentStatus.PENDING } } } },
      },
    })
    if (!row) return null
    return {
      input: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        body: row.body,
        categoryId: row.categoryId ?? "",
        tags: row.tags.map((link) => link.tag.name).sort((a, b) => a.localeCompare(b)),
        featuredImageUrl: row.featuredImageUrl ?? "",
        featuredImageAlt: row.featuredImageAlt ?? "",
        featuredMediaId: row.featuredMediaId ?? "",
        metaTitle: row.metaTitle ?? "",
        metaDescription: row.metaDescription ?? "",
        robotsIndex: row.robotsIndex,
        featured: row.featured,
        commentsEnabled: row.commentsEnabled,
        publishAtIso: row.publishedAt?.toISOString() ?? "",
      },
      state: postState(row.status, row.publishedAt),
      publishedAtIso: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorName: row.author.name,
      pendingComments: row._count.comments,
    }
  } catch (error) {
    console.error("[blog] ops post load failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return "offline"
  }
}

export type OpsCategoryRow = { id: string; name: string; slug: string; description: string; sortOrder: number; postCount: number }

export async function loadBlogCategories(): Promise<OpsCategoryRow[] | "offline"> {
  try {
    const rows = await getPrisma().blogCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, description: true, sortOrder: true, _count: { select: { posts: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
      sortOrder: row.sortOrder,
      postCount: row._count.posts,
    }))
  } catch (error) {
    console.error("[blog] category load failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return "offline"
  }
}

export async function loadBlogTagNames(): Promise<string[]> {
  try {
    const rows = await getPrisma().blogTag.findMany({ orderBy: { name: "asc" }, take: 300, select: { name: true } })
    return rows.map((row) => row.name)
  } catch (error) {
    console.error("[blog] tag load failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return []
  }
}

export type CommentFilter = "pending" | "approved" | "spam" | "all"

export function parseCommentFilter(value: string | undefined): CommentFilter {
  return value === "approved" || value === "spam" || value === "all" ? value : "pending"
}

const FILTER_STATUS: Record<Exclude<CommentFilter, "all">, BlogCommentStatus> = {
  pending: BlogCommentStatus.PENDING,
  approved: BlogCommentStatus.APPROVED,
  spam: BlogCommentStatus.SPAM,
}

export type ModerationRow = {
  id: string
  status: BlogCommentStatus
  authorName: string
  authorEmail: string
  body: string
  createdAt: Date
  moderatedAt: Date | null
  moderatorName: string | null
  linkCount: number
  /** Other comments from the same network in the last 24 hours — a flood signal, not proof. */
  sameSourceRecent: number
  post: { id: string; title: string; slug: string; live: boolean }
}

export type ModerationQueue = {
  rows: ModerationRow[]
  total: number
  pageCount: number
  counts: Record<CommentFilter, number>
}

const LINK_PATTERN = /(https?:\/\/|www\.)\S+/gi

export async function loadCommentQueue(input: { filter: CommentFilter; q: string; page: number }): Promise<ModerationQueue | "offline"> {
  const q = input.q.trim().slice(0, 100)
  const search: Prisma.BlogCommentWhereInput = q
    ? { OR: [{ authorName: { contains: q } }, { authorEmail: { contains: q } }, { body: { contains: q } }, { post: { title: { contains: q } } }] }
    : {}
  const where: Prisma.BlogCommentWhereInput = {
    AND: [input.filter === "all" ? {} : { status: FILTER_STATUS[input.filter] }, search],
  }
  const now = new Date()
  try {
    const prisma = getPrisma()
    const [rows, total, grouped] = await Promise.all([
      prisma.blogComment.findMany({
        where,
        orderBy: { createdAt: input.filter === "pending" ? "asc" : "desc" },
        skip: (input.page - 1) * OPS_COMMENT_PAGE_SIZE,
        take: OPS_COMMENT_PAGE_SIZE,
        select: {
          id: true,
          status: true,
          authorName: true,
          authorEmail: true,
          body: true,
          ipHash: true,
          createdAt: true,
          moderatedAt: true,
          moderatedBy: { select: { name: true } },
          post: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
        },
      }),
      prisma.blogComment.count({ where }),
      prisma.blogComment.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
    ])

    const hashes = [...new Set(rows.map((row) => row.ipHash).filter((hash): hash is string => Boolean(hash)))]
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sourceCounts = hashes.length
      ? await prisma.blogComment.groupBy({
          by: ["ipHash"],
          where: { ipHash: { in: hashes }, createdAt: { gte: since } },
          _count: { _all: true },
        })
      : []
    const bySource = new Map(sourceCounts.map((entry) => [entry.ipHash ?? "", entry._count._all]))

    const countFor = (status: BlogCommentStatus) => grouped.find((entry) => entry.status === status)?._count._all ?? 0
    const pending = countFor(BlogCommentStatus.PENDING)
    const approved = countFor(BlogCommentStatus.APPROVED)
    const spam = countFor(BlogCommentStatus.SPAM)

    return {
      rows: rows.map((row) => ({
        id: row.id,
        status: row.status,
        authorName: row.authorName,
        authorEmail: row.authorEmail,
        body: row.body,
        createdAt: row.createdAt,
        moderatedAt: row.moderatedAt,
        moderatorName: row.moderatedBy?.name ?? null,
        linkCount: row.body.match(LINK_PATTERN)?.length ?? 0,
        sameSourceRecent: row.ipHash ? Math.max(0, (bySource.get(row.ipHash) ?? 1) - 1) : 0,
        post: {
          id: row.post.id,
          title: row.post.title,
          slug: row.post.slug,
          live: postState(row.post.status, row.post.publishedAt, now) === "published",
        },
      })),
      total,
      pageCount: Math.max(1, Math.ceil(total / OPS_COMMENT_PAGE_SIZE)),
      counts: { pending, approved, spam, all: pending + approved + spam },
    }
  } catch (error) {
    console.error("[blog] comment queue failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return "offline"
  }
}

export async function countPendingComments(): Promise<number> {
  try {
    return await getPrisma().blogComment.count({ where: { status: BlogCommentStatus.PENDING } })
  } catch (error) {
    console.error("[blog] pending count failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return 0
  }
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number(raw)
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1
}
