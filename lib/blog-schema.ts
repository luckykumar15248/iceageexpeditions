/**
 * Blog limits and validation shared by the ops editor (counters) and server actions (enforcement).
 * Client-safe: no database or Node imports.
 */
import { z } from "zod"
import { safeImageSrc } from "@/lib/markdown"

export const BLOG_LIMITS = {
  title: 200,
  slug: 160,
  excerpt: 400,
  excerptMinToPublish: 40,
  body: 150_000,
  bodyMinToPublish: 200,
  imageAlt: 240,
  metaTitle: 70,
  metaDescription: 170,
  tags: 10,
  tagName: 40,
  categoryName: 80,
  categoryDescription: 300,
  commentName: 80,
  commentEmail: 191,
  commentBody: 3000,
} as const

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ID = z.string().trim().max(40)

export function slugifyBlog(value: string, max: number = BLOG_LIMITS.slug): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "")
}

export type BlogPostInput = {
  id?: string
  title: string
  slug: string
  excerpt: string
  body: string
  categoryId: string
  tags: string[]
  featuredImageUrl: string
  featuredImageAlt: string
  featuredMediaId: string
  metaTitle: string
  metaDescription: string
  robotsIndex: boolean
  featured: boolean
  commentsEnabled: boolean
  /** ISO timestamp from the editor. Empty means "now" when publishing. A future value schedules the post. */
  publishAtIso: string
}

export type BlogIntent = "draft" | "publish"

export type BlogPostField = "title" | "slug" | "excerpt" | "body" | "categoryId" | "tags" | "featuredImageUrl" | "featuredImageAlt" | "metaTitle" | "metaDescription" | "publishAt"

export type BlogFieldErrors = Partial<Record<BlogPostField, string>>

const postShape = z.object({
  id: ID.optional(),
  title: z.string().max(BLOG_LIMITS.title * 2),
  slug: z.string().max(BLOG_LIMITS.slug * 2),
  excerpt: z.string().max(BLOG_LIMITS.excerpt * 2),
  body: z.string().max(BLOG_LIMITS.body + 1),
  categoryId: ID,
  tags: z.array(z.string().max(BLOG_LIMITS.tagName * 2)).max(BLOG_LIMITS.tags * 2),
  featuredImageUrl: z.string().max(1000),
  featuredImageAlt: z.string().max(BLOG_LIMITS.imageAlt * 2),
  featuredMediaId: ID,
  metaTitle: z.string().max(BLOG_LIMITS.metaTitle * 2),
  metaDescription: z.string().max(BLOG_LIMITS.metaDescription * 2),
  robotsIndex: z.boolean(),
  featured: z.boolean(),
  commentsEnabled: z.boolean(),
  publishAtIso: z.string().max(40),
})

export type NormalizedBlogPost = {
  id?: string
  title: string
  slug: string
  excerpt: string
  body: string
  categoryId: string | null
  tags: { name: string; slug: string }[]
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  featuredMediaId: string | null
  metaTitle: string | null
  metaDescription: string | null
  robotsIndex: boolean
  featured: boolean
  commentsEnabled: boolean
  publishAt: Date | null
}

export type BlogValidation = { ok: true; post: NormalizedBlogPost } | { ok: false; message: string; fieldErrors: BlogFieldErrors }

const MAX_SCHEDULE_MS = 1000 * 60 * 60 * 24 * 730

export function validateBlogPost(raw: unknown, intent: BlogIntent): BlogValidation {
  const parsed = postShape.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: "The post could not be read. Reload the editor and try again.", fieldErrors: {} }
  }
  const input = parsed.data
  const errors: BlogFieldErrors = {}
  const publishing = intent === "publish"

  const title = input.title.replace(/\s+/g, " ").trim()
  if (title.length < 3) errors.title = "Add a headline of at least 3 characters."
  else if (title.length > BLOG_LIMITS.title) errors.title = `Keep the headline under ${BLOG_LIMITS.title} characters.`

  const slug = slugifyBlog(input.slug.trim() || title)
  if (!slug || !SLUG.test(slug)) errors.slug = "Use lowercase letters, numbers, and hyphens."

  const excerpt = input.excerpt.replace(/\s+/g, " ").trim()
  if (excerpt.length > BLOG_LIMITS.excerpt) errors.excerpt = `Keep the excerpt under ${BLOG_LIMITS.excerpt} characters.`
  else if (publishing && excerpt.length < BLOG_LIMITS.excerptMinToPublish) {
    errors.excerpt = `Write an excerpt of at least ${BLOG_LIMITS.excerptMinToPublish} characters before publishing. It shows on cards and in search results.`
  }

  const body = input.body.replace(/\r\n?/g, "\n").trim()
  if (body.length > BLOG_LIMITS.body) errors.body = "The article is too long for one post. Split it into a series."
  else if (publishing && body.length < BLOG_LIMITS.bodyMinToPublish) {
    errors.body = `The article needs at least ${BLOG_LIMITS.bodyMinToPublish} characters before it can be published.`
  }

  const tagMap = new Map<string, string>()
  for (const rawTag of input.tags) {
    const name = rawTag.replace(/\s+/g, " ").trim()
    if (!name) continue
    const tagSlug = slugifyBlog(name, 80)
    if (name.length < 2 || name.length > BLOG_LIMITS.tagName || !tagSlug) {
      errors.tags = `Each tag needs 2 to ${BLOG_LIMITS.tagName} characters with at least one letter or number.`
      continue
    }
    if (!tagMap.has(tagSlug)) tagMap.set(tagSlug, name)
  }
  if (tagMap.size > BLOG_LIMITS.tags) errors.tags = `Use at most ${BLOG_LIMITS.tags} tags.`

  const imageUrl = input.featuredImageUrl.trim()
  const imageAlt = input.featuredImageAlt.replace(/\s+/g, " ").trim()
  if (imageUrl && (imageUrl.length > 500 || !safeImageSrc(imageUrl))) {
    errors.featuredImageUrl = "Pick an image from the media library or use an https:// address."
  }
  if (imageAlt.length > BLOG_LIMITS.imageAlt) errors.featuredImageAlt = `Keep alt text under ${BLOG_LIMITS.imageAlt} characters.`
  else if (publishing && imageUrl && imageAlt.length < 3) {
    errors.featuredImageAlt = "Describe the featured image for screen-reader users before publishing."
  }

  const metaTitle = input.metaTitle.replace(/\s+/g, " ").trim()
  if (metaTitle.length > BLOG_LIMITS.metaTitle) errors.metaTitle = `Search engines cut titles after about ${BLOG_LIMITS.metaTitle} characters.`
  const metaDescription = input.metaDescription.replace(/\s+/g, " ").trim()
  if (metaDescription.length > BLOG_LIMITS.metaDescription) {
    errors.metaDescription = `Keep the meta description under ${BLOG_LIMITS.metaDescription} characters.`
  }

  let publishAt: Date | null = null
  const publishAtIso = input.publishAtIso.trim()
  if (publishAtIso) {
    const date = new Date(publishAtIso)
    if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000) errors.publishAt = "Enter a valid publish date and time."
    else if (date.getTime() - Date.now() > MAX_SCHEDULE_MS) errors.publishAt = "Schedule posts at most two years ahead."
    else publishAt = date
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Some fields need attention. Your edits are still on this page.", fieldErrors: errors }
  }

  return {
    ok: true,
    post: {
      id: input.id?.trim() || undefined,
      title,
      slug,
      excerpt,
      body,
      categoryId: input.categoryId.trim() || null,
      tags: [...tagMap.entries()].map(([tagSlug, name]) => ({ name, slug: tagSlug })),
      featuredImageUrl: imageUrl || null,
      featuredImageAlt: imageUrl ? imageAlt || null : null,
      featuredMediaId: imageUrl ? input.featuredMediaId.trim() || null : null,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      robotsIndex: input.robotsIndex,
      featured: input.featured,
      commentsEnabled: input.commentsEnabled,
      publishAt,
    },
  }
}

export const blogCategorySchema = z.object({
  id: ID.optional(),
  name: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(2, "Name needs at least 2 characters.").max(BLOG_LIMITS.categoryName, `Keep the name under ${BLOG_LIMITS.categoryName} characters.`)),
  slug: z.string().max(200),
  description: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(BLOG_LIMITS.categoryDescription, `Keep the description under ${BLOG_LIMITS.categoryDescription} characters.`)),
  sortOrder: z.number().int().min(0).max(999),
})

export type BlogCategoryInput = z.input<typeof blogCategorySchema>

export const blogCommentSchema = z.object({
  postId: z.string().trim().min(1).max(40),
  authorName: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(2, "Enter your name (at least 2 characters).").max(BLOG_LIMITS.commentName, `Keep your name under ${BLOG_LIMITS.commentName} characters.`)),
  authorEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(BLOG_LIMITS.commentEmail, "That email address is too long.")),
  body: z
    .string()
    .transform((value) => value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
    .pipe(z.string().min(3, "Write a comment of at least 3 characters.").max(BLOG_LIMITS.commentBody, `Keep comments under ${BLOG_LIMITS.commentBody} characters.`)),
})

export type BlogCommentField = "authorName" | "authorEmail" | "body" | "captcha"

export type CommentFormState = {
  status: "idle" | "success" | "error"
  message: string
  fieldErrors: Partial<Record<BlogCommentField, string>>
  values: { authorName: string; authorEmail: string; body: string }
}

export const initialCommentState: CommentFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: { authorName: "", authorEmail: "", body: "" },
}
