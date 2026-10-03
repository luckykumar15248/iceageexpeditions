"use server"

import { createHmac } from "node:crypto"
import { headers } from "next/headers"
import { BlogCommentStatus, BlogPostStatus } from "@/app/generated/prisma/client"
import { verifyCaptcha } from "@/lib/captcha"
import { blogCommentSchema, type BlogCommentField, type CommentFormState } from "@/lib/blog-schema"
import { getPrisma } from "@/lib/db"

const RATE_WINDOW_MS = 10 * 60 * 1000
const MAX_PER_SOURCE = 3
const MAX_PER_EMAIL = 5
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000
/** More links than this goes straight to the spam tab for review instead of the pending queue. */
const MAX_LINKS_BEFORE_SPAM = 3

const RECEIVED =
  "Thanks. Your comment is waiting for moderation and appears on this post once the team approves it."

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function hashSource(ip: string | null): string | null {
  const salt = process.env.COMMENT_IP_SALT?.trim() || process.env.OPS_SESSION_SECRET?.trim()
  if (!ip || !salt) return null
  return createHmac("sha256", salt).update(ip).digest("hex")
}

export async function submitCommentAction(_previous: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const values: CommentFormState["values"] = {
    authorName: read(formData, "authorName"),
    authorEmail: read(formData, "authorEmail"),
    body: read(formData, "body"),
  }
  const cleared: CommentFormState["values"] = { authorName: values.authorName, authorEmail: values.authorEmail, body: "" }

  // Honeypot: real readers never see this field. Bots that fill it get a normal-looking reply.
  if (read(formData, "website").trim() !== "") {
    return { status: "success", message: RECEIVED, fieldErrors: {}, values: cleared }
  }

  const parsed = blogCommentSchema.safeParse({ ...values, postId: read(formData, "postId") })
  if (!parsed.success) {
    const fieldErrors: Partial<Record<BlogCommentField, string>> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === "authorName" || field === "authorEmail" || field === "body") fieldErrors[field] ??= issue.message
    }
    return {
      status: "error",
      message: Object.keys(fieldErrors).length > 0 ? "Check the highlighted fields." : "This comment could not be read. Reload the page and try again.",
      fieldErrors,
      values,
    }
  }

  const captcha = await verifyCaptcha(formData, "comment")
  if (!captcha.ok) {
    return { status: "error", message: "Complete the security check below, then post again.", fieldErrors: { captcha: captcha.message }, values }
  }

  const input = parsed.data
  const requestHeaders = await headers()
  const ipHash = hashSource(requestHeaders.get("x-real-ip")?.trim() || null)
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 255) || null
  const now = new Date()

  try {
    const prisma = getPrisma()
    const post = await prisma.blogPost.findFirst({
      where: { id: input.postId, status: BlogPostStatus.PUBLISHED, publishedAt: { lte: now } },
      select: { id: true, commentsEnabled: true },
    })
    if (!post) return { status: "error", message: "This post is no longer available for comments.", fieldErrors: {}, values }
    if (!post.commentsEnabled) return { status: "error", message: "Comments are closed on this post.", fieldErrors: {}, values }

    const windowStart = new Date(now.getTime() - RATE_WINDOW_MS)
    const [fromSource, fromEmail, duplicate] = await Promise.all([
      ipHash ? prisma.blogComment.count({ where: { ipHash, createdAt: { gte: windowStart } } }) : Promise.resolve(0),
      prisma.blogComment.count({ where: { authorEmail: input.authorEmail, createdAt: { gte: windowStart } } }),
      prisma.blogComment.findFirst({
        where: {
          postId: post.id,
          authorEmail: input.authorEmail,
          body: input.body,
          createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
        },
        select: { id: true },
      }),
    ])
    if (duplicate) return { status: "success", message: RECEIVED, fieldErrors: {}, values: cleared }
    if (fromSource >= MAX_PER_SOURCE || fromEmail >= MAX_PER_EMAIL) {
      return {
        status: "error",
        message: "You have posted several comments in the last few minutes. Wait ten minutes, then try again.",
        fieldErrors: {},
        values,
      }
    }

    const links = input.body.match(/(https?:\/\/|www\.)\S+/gi)?.length ?? 0
    await prisma.blogComment.create({
      data: {
        postId: post.id,
        authorName: input.authorName,
        authorEmail: input.authorEmail,
        body: input.body,
        status: links > MAX_LINKS_BEFORE_SPAM ? BlogCommentStatus.SPAM : BlogCommentStatus.PENDING,
        ipHash,
        userAgent,
      },
    })
    return { status: "success", message: RECEIVED, fieldErrors: {}, values: cleared }
  } catch (error) {
    console.error("[blog] comment was not saved", { error: error instanceof Error ? error.name : "UNKNOWN" })
    return { status: "error", message: "Your comment could not be saved. Try again in a moment.", fieldErrors: {}, values }
  }
}
