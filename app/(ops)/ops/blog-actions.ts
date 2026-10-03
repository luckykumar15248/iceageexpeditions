"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"
import { AuditAction, BlogCommentStatus, BlogPostStatus } from "@/app/generated/prisma/client"
import { writeAudit } from "@/lib/audit"
import { BLOG_CACHE_TAG } from "@/lib/blog"
import { postState, type OpsPostState } from "@/lib/blog-admin"
import { blogCategorySchema, slugifyBlog, validateBlogPost, type BlogFieldErrors, type BlogIntent, type BlogPostInput } from "@/lib/blog-schema"
import { getPrisma, isUniqueConflict } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"
import { readingMinutesFor } from "@/lib/markdown"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, requireStaff } from "@/lib/staff"

type ActionResult = { ok: boolean; message: string }

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
}

async function authorize(permission: StaffPermission, denied: string): Promise<{ id: string } | ActionResult> {
  const actor = await requireOpsStaff()
  try {
    await requireStaff(actor.id, permission)
    return { id: actor.id }
  } catch (error) {
    if (isRedirect(error)) throw error
    return { ok: false, message: denied }
  }
}

function refreshBlog(slugs: string[]) {
  updateTag(BLOG_CACHE_TAG)
  revalidatePath("/blog")
  for (const slug of new Set(slugs)) revalidatePath(`/blog/${slug}`)
  revalidatePath("/ops/blog")
  revalidatePath("/ops/comments")
}

const idSchema = z.string().trim().min(1).max(40)

// ─── Posts ────────────────────────────────────────────────────────────────────

export type BlogSaveResult = {
  ok: boolean
  message: string
  fieldErrors: BlogFieldErrors
  id?: string
  slug?: string
  state?: OpsPostState
  publishedAtIso?: string | null
}

export async function saveBlogPostAction(raw: BlogPostInput, intent: BlogIntent): Promise<BlogSaveResult> {
  const actor = await authorize(StaffPermission.blogWrite, "This desk role cannot edit blog posts.")
  if (!("id" in actor)) return { ...actor, fieldErrors: {} }
  if (intent !== "draft" && intent !== "publish") return { ok: false, message: "Unknown save action.", fieldErrors: {} }

  const validation = validateBlogPost(raw, intent)
  if (!validation.ok) return { ok: false, message: validation.message, fieldErrors: validation.fieldErrors }
  const post = validation.post

  const now = new Date()
  const status = intent === "publish" ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT
  const publishedAt = intent === "publish" ? (post.publishAt ?? now) : post.publishAt
  const readingMinutes = readingMinutesFor(post.body)

  const prisma = getPrisma()
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const existing = post.id
        ? await tx.blogPost.findUnique({ where: { id: post.id }, select: { id: true, slug: true, status: true, publishedAt: true } })
        : null
      if (post.id && !existing) throw new DomainError(DomainErrorCode.CONTENT_INVALID, "This post no longer exists. It may have been deleted.")

      if (post.categoryId) {
        const category = await tx.blogCategory.findUnique({ where: { id: post.categoryId }, select: { id: true } })
        if (!category) throw new FieldError("categoryId", "That category was deleted. Pick another one.")
      }

      let featuredMediaId = post.featuredMediaId
      if (featuredMediaId) {
        const asset = await tx.mediaAsset.findUnique({ where: { id: featuredMediaId }, select: { assetType: true, url: true } })
        if (!asset || asset.assetType !== "IMAGE" || asset.url !== post.featuredImageUrl) featuredMediaId = null
      }

      const tagIds: string[] = []
      for (const tag of post.tags) {
        const row = await tx.blogTag.upsert({
          where: { slug: tag.slug },
          create: { name: tag.name, slug: tag.slug },
          update: {},
          select: { id: true },
        })
        tagIds.push(row.id)
      }

      const data = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        status,
        publishedAt,
        readingMinutes,
        featured: post.featured,
        commentsEnabled: post.commentsEnabled,
        featuredImageUrl: post.featuredImageUrl,
        featuredImageAlt: post.featuredImageAlt,
        featuredMediaId,
        categoryId: post.categoryId,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        robotsIndex: post.robotsIndex,
      }

      const row = existing
        ? await tx.blogPost.update({
            where: { id: existing.id },
            data: { ...data, tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } },
            select: { id: true, slug: true, status: true, publishedAt: true },
          })
        : await tx.blogPost.create({
            data: { ...data, authorStaffId: actor.id, tags: { create: tagIds.map((tagId) => ({ tagId })) } },
            select: { id: true, slug: true, status: true, publishedAt: true },
          })

      const state = postState(row.status, row.publishedAt, now)
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.BLOG_POST_SAVED,
        entityType: "BlogPost",
        entityId: row.id,
        reason: existing ? `Staff updated a blog post (${state})` : `Staff created a blog post (${state})`,
        before: existing ? { slug: existing.slug, status: existing.status, publishedAt: existing.publishedAt?.toISOString() ?? null } : undefined,
        after: { slug: row.slug, title: post.title, status: row.status, publishedAt: row.publishedAt?.toISOString() ?? null, tags: post.tags.map((tag) => tag.slug) },
      })
      return { row, state, previousSlug: existing?.slug ?? null }
    })

    refreshBlog([saved.row.slug, ...(saved.previousSlug ? [saved.previousSlug] : [])])
    revalidatePath(`/ops/blog/${saved.row.id}`)

    const message =
      saved.state === "published"
        ? "Published. The post is live on the blog."
        : saved.state === "scheduled"
          ? "Scheduled. The post goes live at the publish time shown (within about a minute)."
          : "Draft saved. It is not visible to the public."
    return {
      ok: true,
      message,
      fieldErrors: {},
      id: saved.row.id,
      slug: saved.row.slug,
      state: saved.state,
      publishedAtIso: saved.row.publishedAt?.toISOString() ?? null,
    }
  } catch (error) {
    if (isRedirect(error)) throw error
    if (error instanceof FieldError) return { ok: false, message: error.message, fieldErrors: { [error.field]: error.message } }
    if (isUniqueConflict(error)) {
      const message = "Another post already uses this URL slug. Change the slug and save again."
      return { ok: false, message, fieldErrors: { slug: message } }
    }
    if (error instanceof DomainError) return { ok: false, message: error.message, fieldErrors: {} }
    console.error("[blog] post save failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return { ok: false, message: "The post could not be saved. Your edits are still on this page.", fieldErrors: {} }
  }
}

class FieldError extends Error {
  constructor(
    readonly field: keyof BlogFieldErrors,
    message: string,
  ) {
    super(message)
    this.name = "FieldError"
  }
}

export async function deleteBlogPostAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: "Invalid post ID." }
  const actor = await authorize(StaffPermission.blogWrite, "This desk role cannot delete blog posts.")
  if (!("id" in actor)) return actor

  const prisma = getPrisma()
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: parsed.data },
      select: { id: true, slug: true, title: true, status: true, _count: { select: { comments: true } } },
    })
    if (!post) return { ok: false, message: "This post was already deleted." }
    await prisma.$transaction(async (tx) => {
      await tx.blogPost.delete({ where: { id: post.id } })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.BLOG_POST_DELETED,
        entityType: "BlogPost",
        entityId: post.id,
        reason: "Staff deleted a blog post",
        before: { slug: post.slug, title: post.title, status: post.status, comments: post._count.comments },
      })
    })
    refreshBlog([post.slug])
    return { ok: true, message: `Deleted “${post.title}” and its ${post._count.comments} comment${post._count.comments === 1 ? "" : "s"}.` }
  } catch (error) {
    console.error("[blog] post delete failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return { ok: false, message: "The post could not be deleted." }
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategorySaveResult = ActionResult & { id?: string; fieldErrors: Partial<Record<"name" | "slug" | "description" | "sortOrder", string>> }

export async function saveBlogCategoryAction(raw: unknown): Promise<CategorySaveResult> {
  const actor = await authorize(StaffPermission.blogWrite, "This desk role cannot edit blog categories.")
  if (!("id" in actor)) return { ...actor, fieldErrors: {} }

  const parsed = blogCategorySchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: CategorySaveResult["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === "name" || field === "slug" || field === "description" || field === "sortOrder") fieldErrors[field] ??= issue.message
    }
    return { ok: false, message: "Check the highlighted fields.", fieldErrors }
  }
  const input = parsed.data
  const slug = slugifyBlog(input.slug.trim() || input.name, 100)
  if (!slug) return { ok: false, message: "Check the highlighted fields.", fieldErrors: { slug: "Use lowercase letters, numbers, and hyphens." } }

  const data = { name: input.name, slug, description: input.description || null, sortOrder: input.sortOrder }
  const prisma = getPrisma()
  try {
    const row = await prisma.$transaction(async (tx) => {
      const saved = input.id
        ? await tx.blogCategory.update({ where: { id: input.id }, data, select: { id: true } })
        : await tx.blogCategory.create({ data, select: { id: true } })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.BLOG_CATEGORY_SAVED,
        entityType: "BlogCategory",
        entityId: saved.id,
        reason: input.id ? "Staff updated a blog category" : "Staff created a blog category",
        after: data,
      })
      return saved
    })
    updateTag(BLOG_CACHE_TAG)
    revalidatePath("/blog")
    revalidatePath("/ops/blog/categories")
    return { ok: true, message: input.id ? "Category updated." : "Category created.", id: row.id, fieldErrors: {} }
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { ok: false, message: "A category with this name or slug already exists.", fieldErrors: { name: "Already in use.", slug: "Already in use." } }
    }
    console.error("[blog] category save failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return { ok: false, message: "The category could not be saved.", fieldErrors: {} }
  }
}

export async function deleteBlogCategoryAction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: "Invalid category ID." }
  const actor = await authorize(StaffPermission.blogWrite, "This desk role cannot delete blog categories.")
  if (!("id" in actor)) return actor

  const prisma = getPrisma()
  try {
    const category = await prisma.blogCategory.findUnique({
      where: { id: parsed.data },
      select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
    })
    if (!category) return { ok: false, message: "This category was already deleted." }
    await prisma.$transaction(async (tx) => {
      await tx.blogCategory.delete({ where: { id: category.id } })
      await writeAudit(tx, {
        actorStaffId: actor.id,
        action: AuditAction.BLOG_CATEGORY_DELETED,
        entityType: "BlogCategory",
        entityId: category.id,
        reason: "Staff deleted a blog category",
        before: { name: category.name, slug: category.slug, posts: category._count.posts },
      })
    })
    updateTag(BLOG_CACHE_TAG)
    revalidatePath("/blog")
    revalidatePath("/ops/blog")
    revalidatePath("/ops/blog/categories")
    const count = category._count.posts
    return {
      ok: true,
      message: count > 0 ? `Category deleted. ${count} post${count === 1 ? " is" : "s are"} now uncategorised.` : "Category deleted.",
    }
  } catch (error) {
    console.error("[blog] category delete failed", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return { ok: false, message: "The category could not be deleted." }
  }
}

// ─── Comment moderation ───────────────────────────────────────────────────────

export type ModerationAction = "approve" | "spam" | "pending" | "delete"

const moderationSchema = z.object({
  ids: z.array(idSchema).min(1).max(100),
  action: z.enum(["approve", "spam", "pending", "delete"]),
})

const TARGET_STATUS: Record<Exclude<ModerationAction, "delete">, BlogCommentStatus> = {
  approve: BlogCommentStatus.APPROVED,
  spam: BlogCommentStatus.SPAM,
  pending: BlogCommentStatus.PENDING,
}

const DONE_LABEL: Record<ModerationAction, string> = {
  approve: "approved and now visible on the post",
  spam: "marked as spam",
  pending: "moved back to pending",
  delete: "deleted",
}

const AUDIT_REASON: Record<ModerationAction, string> = {
  approve: "Staff approved a blog comment",
  spam: "Staff marked a blog comment as spam",
  pending: "Staff returned a blog comment to the pending queue",
  delete: "Staff deleted a blog comment",
}

export async function moderateCommentsAction(ids: string[], action: ModerationAction): Promise<ActionResult & { affected: number }> {
  const parsed = moderationSchema.safeParse({ ids: [...new Set(ids)], action })
  if (!parsed.success) return { ok: false, message: "Select at least one comment (up to 100).", affected: 0 }
  const actor = await authorize(StaffPermission.commentModerate, "This desk role cannot moderate comments.")
  if (!("id" in actor)) return { ...actor, affected: 0 }

  const prisma = getPrisma()
  try {
    const comments = await prisma.blogComment.findMany({
      where: { id: { in: parsed.data.ids } },
      select: { id: true, status: true, authorName: true, post: { select: { slug: true } } },
    })
    if (comments.length === 0) return { ok: false, message: "Those comments were already removed.", affected: 0 }

    const now = new Date()
    const commentIds = comments.map((comment) => comment.id)
    await prisma.$transaction(async (tx) => {
      if (parsed.data.action === "delete") {
        await tx.blogComment.deleteMany({ where: { id: { in: commentIds } } })
      } else {
        await tx.blogComment.updateMany({
          where: { id: { in: commentIds } },
          data: { status: TARGET_STATUS[parsed.data.action], moderatedByStaffId: actor.id, moderatedAt: now },
        })
      }
      for (const comment of comments) {
        await writeAudit(tx, {
          actorStaffId: actor.id,
          action: parsed.data.action === "delete" ? AuditAction.BLOG_COMMENT_DELETED : AuditAction.BLOG_COMMENT_MODERATED,
          entityType: "BlogComment",
          entityId: comment.id,
          reason: AUDIT_REASON[parsed.data.action],
          before: { status: comment.status, authorName: comment.authorName, post: comment.post.slug },
          after: parsed.data.action === "delete" ? undefined : { status: TARGET_STATUS[parsed.data.action] },
        })
      }
    })

    refreshBlog(comments.map((comment) => comment.post.slug))
    const count = comments.length
    return { ok: true, message: `${count} comment${count === 1 ? "" : "s"} ${DONE_LABEL[parsed.data.action]}.`, affected: count }
  } catch (error) {
    console.error("[blog] moderation failed", { action, error: error instanceof Error ? error.name : "UNKNOWN" })
    return { ok: false, message: "The comments could not be updated. Try again.", affected: 0 }
  }
}
