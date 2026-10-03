"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react"
import { saveBlogPostAction } from "@/app/(ops)/ops/blog-actions"
import { DeletePostButton } from "@/components/ops/blog/delete-post-button"
import { MediaPickerModal } from "@/components/ops/media-picker-modal"
import type { OpsPostState } from "@/lib/blog-admin"
import { BLOG_LIMITS, slugifyBlog, type BlogFieldErrors, type BlogIntent, type BlogPostInput } from "@/lib/blog-schema"
import { markdownToPlainText, readingMinutesFor, renderMarkdown } from "@/lib/markdown"
import type { MediaAssetRow } from "@/lib/media-assets"

type Props = {
  initial: BlogPostInput
  state: OpsPostState | "new"
  authorName: string
  pendingComments: number
  categories: { id: string; name: string }[]
  tagSuggestions: string[]
  mediaAssets: MediaAssetRow[]
}

const IST_OFFSET_MS = 330 * 60 * 1000

/** India has no DST, so a fixed +05:30 keeps server and browser renders identical. */
function isoToIstInput(iso: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16)
}

function istInputToIso(value: string): string {
  if (!value) return ""
  const date = new Date(`${value}:00+05:30`)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

const STATE_LABEL: Record<OpsPostState | "new", { label: string; className: string }> = {
  new: { label: "New draft", className: "bg-canvas text-muted" },
  draft: { label: "Draft", className: "bg-canvas text-muted" },
  scheduled: { label: "Scheduled", className: "bg-amber-50 text-amber-800" },
  published: { label: "Published", className: "bg-alpine-soft text-alpine-deep" },
}

const inputClass = "min-h-11 w-full rounded-md border bg-paper px-3 text-base text-ink"

export function PostEditor({ initial, state: initialState, authorName, pendingComments, categories, tagSuggestions, mediaAssets }: Props) {
  const router = useRouter()
  const ids = useId()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [post, setPost] = useState<BlogPostInput>(initial)
  const [saved, setSaved] = useState(() => JSON.stringify(initial))
  const [postState, setPostState] = useState(initialState)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const [errors, setErrors] = useState<BlogFieldErrors>({})
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null)
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [picker, setPicker] = useState<"featured" | "body" | null>(null)
  const [tagDraft, setTagDraft] = useState("")
  const [pending, startTransition] = useTransition()
  const [openedAt] = useState(() => Date.now())

  const dirty = JSON.stringify(post) !== saved
  const publishLocal = isoToIstInput(post.publishAtIso)
  const futurePublish = post.publishAtIso !== "" && new Date(post.publishAtIso).getTime() > openedAt
  const words = useMemo(() => markdownToPlainText(post.body).split(/\s+/).filter(Boolean).length, [post.body])
  const minutes = useMemo(() => readingMinutesFor(post.body), [post.body])
  const preview = useMemo(() => (tab === "preview" ? renderMarkdown(post.body).content : null), [tab, post.body])

  useEffect(() => {
    if (!dirty) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function update<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setPost((current) => ({ ...current, [key]: value }))
  }

  function updateTitle(title: string) {
    setPost((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugifyBlog(title) }))
  }

  const save = useCallback(
    (intent: BlogIntent) => {
      setNotice(null)
      startTransition(async () => {
        const result = await saveBlogPostAction(post, intent)
        setErrors(result.fieldErrors)
        setNotice({ ok: result.ok, message: result.message })
        if (!result.ok || !result.id) return
        const next: BlogPostInput = { ...post, id: result.id, slug: result.slug ?? post.slug, publishAtIso: result.publishedAtIso ?? "" }
        setPost(next)
        setSaved(JSON.stringify(next))
        setSlugTouched(true)
        if (result.state) setPostState(result.state)
        if (!post.id) router.replace(`/ops/blog/${result.id}?created=1`)
      })
    },
    [post, router],
  )

  function replaceSelection(build: (selected: string) => { text: string; selectFrom: number; selectTo: number }) {
    const element = bodyRef.current
    if (!element) return
    const { selectionStart, selectionEnd, value } = element
    const { text, selectFrom, selectTo } = build(value.slice(selectionStart, selectionEnd))
    const nextBody = value.slice(0, selectionStart) + text + value.slice(selectionEnd)
    update("body", nextBody)
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(selectionStart + selectFrom, selectionStart + selectTo)
    })
  }

  function wrap(before: string, after: string, placeholder: string) {
    replaceSelection((selected) => {
      const inner = selected || placeholder
      return { text: `${before}${inner}${after}`, selectFrom: before.length, selectTo: before.length + inner.length }
    })
  }

  function prefixLines(prefix: (index: number) => string, placeholder: string) {
    const element = bodyRef.current
    if (!element) return
    const { value, selectionStart, selectionEnd } = element
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1
    const nextBreak = value.indexOf("\n", selectionEnd)
    const lineEnd = nextBreak === -1 ? value.length : nextBreak
    const block = value.slice(lineStart, lineEnd) || placeholder
    const replaced = block
      .split("\n")
      .map((line, index) => `${prefix(index)}${line.replace(/^(#{1,4}\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/, "")}`)
      .join("\n")
    update("body", value.slice(0, lineStart) + replaced + value.slice(lineEnd))
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(lineStart, lineStart + replaced.length)
    })
  }

  function insertBlock(text: string) {
    replaceSelection(() => {
      const element = bodyRef.current
      const before = element ? element.value.slice(0, element.selectionStart) : ""
      const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n"
      const full = `${lead}${text}\n\n`
      return { text: full, selectFrom: full.length, selectTo: full.length }
    })
  }

  function onBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === "b") {
      event.preventDefault()
      wrap("**", "**", "bold text")
    } else if (key === "i") {
      event.preventDefault()
      wrap("*", "*", "italic text")
    } else if (key === "k") {
      event.preventDefault()
      linkSelection()
    }
  }

  function linkSelection() {
    replaceSelection((selected) => {
      const label = selected || "link text"
      const text = `[${label}](https://)`
      return { text, selectFrom: label.length + 3, selectTo: text.length - 1 }
    })
  }

  function addTag(raw: string) {
    const name = raw.replace(/\s+/g, " ").trim().replace(/^#/, "")
    setTagDraft("")
    if (!name) return
    setPost((current) => {
      const slug = slugifyBlog(name, 80)
      if (!slug || current.tags.some((tag) => slugifyBlog(tag, 80) === slug) || current.tags.length >= BLOG_LIMITS.tags) return current
      return { ...current, tags: [...current.tags, name.slice(0, BLOG_LIMITS.tagName)] }
    })
  }

  function onTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      addTag(tagDraft)
    } else if (event.key === "Backspace" && tagDraft === "" && post.tags.length > 0) {
      update("tags", post.tags.slice(0, -1))
    }
  }

  const closePicker = useCallback(() => setPicker(null), [])

  function onPick(asset: MediaAssetRow) {
    if (picker === "featured") {
      setPost((current) => ({
        ...current,
        featuredImageUrl: asset.url,
        featuredMediaId: asset.id,
        featuredImageAlt: current.featuredImageAlt || asset.altText || "",
      }))
    } else if (picker === "body") {
      const alt = (asset.altText ?? "").replace(/[[\]]/g, "")
      insertBlock(`![${alt || "Describe this photo"}](${asset.url})`)
    }
    setPicker(null)
  }

  const publishLabel = futurePublish ? "Schedule" : postState === "published" ? "Update post" : "Publish now"
  const metaTitleLength = (post.metaTitle || post.title).length
  const metaDescriptionLength = (post.metaDescription || post.excerpt).length
  const suggestionList = tagSuggestions.filter((name) => !post.tags.includes(name))

  return (
    <div
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault()
          if (!pending) save(postState === "published" || postState === "scheduled" ? "publish" : "draft")
        }
      }}
    >
      {notice ? (
        <p
          className={`mb-6 rounded-2xl border px-4 py-3 text-base ${notice.ok ? "border-alpine bg-alpine-soft text-ink" : "border-danger/40 bg-paper text-danger"}`}
          role={notice.ok ? "status" : "alert"}
        >
          {notice.message}
        </p>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          <Panel>
            <label htmlFor={`${ids}-title`} className="text-sm font-semibold text-ink">
              Headline
            </label>
            <input
              id={`${ids}-title`}
              value={post.title}
              onChange={(event) => updateTitle(event.target.value)}
              maxLength={BLOG_LIMITS.title}
              placeholder="e.g. Acclimatizing in Leh before Khardung La"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? `${ids}-title-error` : undefined}
              className={`mt-2 min-h-14 w-full rounded-md border bg-paper px-4 font-display text-2xl font-bold text-ink ${errors.title ? "border-danger" : "border-line"}`}
            />
            <FieldError id={`${ids}-title-error`} message={errors.title} />

            <div className="mt-4">
              <label htmlFor={`${ids}-slug`} className="text-sm font-semibold text-ink">
                URL slug
              </label>
              <div className={`mt-2 flex min-h-11 items-center overflow-hidden rounded-md border bg-paper ${errors.slug ? "border-danger" : "border-line"}`}>
                <span className="shrink-0 border-r border-line bg-canvas px-3 py-2.5 text-sm text-muted">/blog/</span>
                <input
                  id={`${ids}-slug`}
                  value={post.slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    update("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, BLOG_LIMITS.slug))
                  }}
                  onBlur={() => update("slug", slugifyBlog(post.slug || post.title))}
                  aria-invalid={errors.slug ? true : undefined}
                  aria-describedby={`${ids}-slug-hint${errors.slug ? ` ${ids}-slug-error` : ""}`}
                  className="min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none"
                />
              </div>
              <p id={`${ids}-slug-hint`} className="mt-1 text-sm text-muted">
                {post.id && postState === "published"
                  ? "Changing the slug of a live post breaks links that people already shared."
                  : slugTouched
                    ? "Lowercase letters, numbers, and hyphens."
                    : "Follows the headline until you edit it."}
                {slugTouched && post.title ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="font-semibold text-alpine-deep underline"
                      onClick={() => {
                        setSlugTouched(false)
                        update("slug", slugifyBlog(post.title))
                      }}
                    >
                      Reset from headline
                    </button>
                  </>
                ) : null}
              </p>
              <FieldError id={`${ids}-slug-error`} message={errors.slug} />
            </div>

            <div className="mt-4">
              <Counter label="Excerpt" htmlFor={`${ids}-excerpt`} length={post.excerpt.length} max={BLOG_LIMITS.excerpt} />
              <textarea
                id={`${ids}-excerpt`}
                value={post.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
                rows={3}
                maxLength={BLOG_LIMITS.excerpt}
                placeholder="One or two sentences for cards, search results, and social previews."
                aria-invalid={errors.excerpt ? true : undefined}
                aria-describedby={errors.excerpt ? `${ids}-excerpt-error` : undefined}
                className={`mt-2 w-full rounded-md border bg-paper px-3 py-2 text-base leading-relaxed text-ink ${errors.excerpt ? "border-danger" : "border-line"}`}
              />
              <FieldError id={`${ids}-excerpt-error`} message={errors.excerpt} />
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-ink">Article</h2>
              <div className="flex rounded-md border border-line p-0.5" role="tablist" aria-label="Editor mode">
                {(["write", "preview"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={tab === mode}
                    onClick={() => setTab(mode)}
                    className={`min-h-10 rounded px-4 text-sm font-semibold ${tab === mode ? "bg-alpine text-white" : "text-ink hover:bg-canvas"}`}
                  >
                    {mode === "write" ? "Write" : "Preview"}
                  </button>
                ))}
              </div>
            </div>

            {tab === "write" ? (
              <>
                <div className="sticky top-0 z-10 mt-4 flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1" role="toolbar" aria-label="Formatting">
                  <ToolButton label="Bold (Ctrl+B)" onClick={() => wrap("**", "**", "bold text")}>
                    <strong>B</strong>
                  </ToolButton>
                  <ToolButton label="Italic (Ctrl+I)" onClick={() => wrap("*", "*", "italic text")}>
                    <em>I</em>
                  </ToolButton>
                  <ToolButton label="Section heading" onClick={() => prefixLines(() => "## ", "Section heading")}>
                    H2
                  </ToolButton>
                  <ToolButton label="Sub-heading" onClick={() => prefixLines(() => "### ", "Sub-heading")}>
                    H3
                  </ToolButton>
                  <ToolButton label="Bulleted list" onClick={() => prefixLines(() => "- ", "List item")}>
                    • List
                  </ToolButton>
                  <ToolButton label="Numbered list" onClick={() => prefixLines((index) => `${index + 1}. `, "First step")}>
                    1. List
                  </ToolButton>
                  <ToolButton label="Quote" onClick={() => prefixLines(() => "> ", "Quoted text")}>
                    “ Quote
                  </ToolButton>
                  <ToolButton label="Link (Ctrl+K)" onClick={linkSelection}>
                    Link
                  </ToolButton>
                  <ToolButton label="Inline code" onClick={() => wrap("`", "`", "code")}>
                    {"</>"}
                  </ToolButton>
                  <ToolButton label="Divider" onClick={() => insertBlock("---")}>
                    —
                  </ToolButton>
                  <ToolButton label="Insert image from media library" onClick={() => setPicker("body")}>
                    Image
                  </ToolButton>
                </div>
                <label htmlFor={`${ids}-body`} className="sr-only">
                  Article body (Markdown)
                </label>
                <textarea
                  id={`${ids}-body`}
                  ref={bodyRef}
                  value={post.body}
                  onChange={(event) => update("body", event.target.value)}
                  onKeyDown={onBodyKeyDown}
                  rows={24}
                  maxLength={BLOG_LIMITS.body}
                  placeholder={"Start with why this route or skill matters.\n\n## First section\n\nWrite in short paragraphs. Name real places, altitudes you can verify, and what ops actually provides."}
                  aria-invalid={errors.body ? true : undefined}
                  aria-describedby={`${ids}-body-stats${errors.body ? ` ${ids}-body-error` : ""}`}
                  className={`mt-3 min-h-[28rem] w-full rounded-md border bg-paper px-4 py-3 font-mono text-[0.95rem] leading-7 text-ink ${errors.body ? "border-danger" : "border-line"}`}
                />
              </>
            ) : (
              <div className="mt-4 min-h-[28rem] rounded-md border border-line bg-paper px-5 py-6 sm:px-8">
                {post.body.trim() ? preview : <p className="text-base text-muted">Nothing to preview yet.</p>}
              </div>
            )}
            <p id={`${ids}-body-stats`} className="mt-2 text-sm text-muted">
              {words.toLocaleString("en-IN")} words · about {minutes} min read
            </p>
            <FieldError id={`${ids}-body-error`} message={errors.body} />
            <details className="mt-3 text-sm text-muted">
              <summary className="cursor-pointer font-semibold text-ink">Formatting reference</summary>
              <ul className="mt-2 grid gap-1 font-mono text-[0.85rem] sm:grid-cols-2">
                <li>## Section heading</li>
                <li>### Sub-heading</li>
                <li>**bold** and *italic*</li>
                <li>[link text](https://…)</li>
                <li>- bulleted item</li>
                <li>1. numbered item</li>
                <li>&gt; quoted text</li>
                <li>![alt text](/uploads/… &quot;caption&quot;)</li>
                <li>--- divider</li>
                <li>``` code block ```</li>
              </ul>
              <p className="mt-2">Raw HTML is shown as text, never run. Leave a blank line between paragraphs.</p>
            </details>
          </Panel>

          <Panel>
            <h2 className="font-display text-lg font-bold text-ink">Search and social</h2>
            <p className="mt-1 text-sm text-muted">Leave empty to use the headline and excerpt.</p>
            <div className="mt-4 grid gap-4">
              <div>
                <Counter label="SEO title" htmlFor={`${ids}-meta-title`} length={metaTitleLength} max={BLOG_LIMITS.metaTitle} />
                <input
                  id={`${ids}-meta-title`}
                  value={post.metaTitle}
                  onChange={(event) => update("metaTitle", event.target.value)}
                  maxLength={BLOG_LIMITS.metaTitle}
                  placeholder={post.title || "Defaults to the headline"}
                  aria-invalid={errors.metaTitle ? true : undefined}
                  className={`mt-2 ${inputClass} ${errors.metaTitle ? "border-danger" : "border-line"}`}
                />
                <FieldError message={errors.metaTitle} />
              </div>
              <div>
                <Counter label="Meta description" htmlFor={`${ids}-meta-description`} length={metaDescriptionLength} max={BLOG_LIMITS.metaDescription} />
                <textarea
                  id={`${ids}-meta-description`}
                  value={post.metaDescription}
                  onChange={(event) => update("metaDescription", event.target.value)}
                  rows={2}
                  maxLength={BLOG_LIMITS.metaDescription}
                  placeholder={post.excerpt || "Defaults to the excerpt"}
                  aria-invalid={errors.metaDescription ? true : undefined}
                  className={`mt-2 w-full rounded-md border bg-paper px-3 py-2 text-base text-ink ${errors.metaDescription ? "border-danger" : "border-line"}`}
                />
                <FieldError message={errors.metaDescription} />
              </div>
              <div className="rounded-2xl border border-line bg-canvas p-4" aria-label="Search result preview">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">Search preview</p>
                <p className="mt-2 truncate text-sm text-muted">iceageexpeditions.com › blog › {post.slug || "your-slug"}</p>
                <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">{post.metaTitle || post.title || "Your headline"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink">{post.metaDescription || post.excerpt || "Your excerpt appears here."}</p>
              </div>
              <label className="flex min-h-11 items-start gap-3 text-base text-ink">
                <input type="checkbox" checked={post.robotsIndex} onChange={(event) => update("robotsIndex", event.target.checked)} className="mt-1 size-5 accent-alpine" />
                <span>
                  Allow search engines to index this post
                  <span className="block text-sm text-muted">Turn off for announcements that expire, like a one-season notice.</span>
                </span>
              </label>
            </div>
          </Panel>
        </div>

        <aside className="grid content-start gap-6">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-ink">Publish</h2>
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide uppercase ${STATE_LABEL[postState].className}`}>
                {STATE_LABEL[postState].label}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Author: {authorName}
              {dirty ? <span className="ml-2 font-semibold text-amber-800">· Unsaved changes</span> : null}
            </p>

            <div className="mt-4">
              <label htmlFor={`${ids}-publish`} className="text-sm font-semibold text-ink">
                Publish time (IST)
              </label>
              <input
                id={`${ids}-publish`}
                type="datetime-local"
                value={publishLocal}
                onChange={(event) => update("publishAtIso", istInputToIso(event.target.value))}
                aria-invalid={errors.publishAt ? true : undefined}
                aria-describedby={`${ids}-publish-hint`}
                className={`mt-2 ${inputClass} ${errors.publishAt ? "border-danger" : "border-line"}`}
              />
              <p id={`${ids}-publish-hint`} className="mt-1 text-sm text-muted">
                Empty publishes now. A future time schedules the post; it goes live within a minute of that time.
              </p>
              {post.publishAtIso ? (
                <button type="button" onClick={() => update("publishAtIso", "")} className="mt-1 text-sm font-semibold text-alpine-deep underline">
                  Clear time
                </button>
              ) : null}
              <FieldError message={errors.publishAt} />
            </div>

            <div className="mt-4 grid gap-2">
              <label className="flex min-h-11 items-center gap-3 text-base text-ink">
                <input type="checkbox" checked={post.featured} onChange={(event) => update("featured", event.target.checked)} className="size-5 accent-alpine" />
                Feature at the top of the blog
              </label>
              <label className="flex min-h-11 items-center gap-3 text-base text-ink">
                <input type="checkbox" checked={post.commentsEnabled} onChange={(event) => update("commentsEnabled", event.target.checked)} className="size-5 accent-alpine" />
                Allow reader comments
              </label>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => save("publish")}
                disabled={pending}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-alpine px-5 text-base font-semibold text-white hover:bg-alpine-deep disabled:opacity-60"
              >
                {pending ? "Saving…" : publishLabel}
              </button>
              <button
                type="button"
                onClick={() => save("draft")}
                disabled={pending}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-line bg-paper px-5 text-base font-semibold text-ink hover:border-alpine disabled:opacity-60"
              >
                {postState === "published" || postState === "scheduled" ? "Unpublish to draft" : "Save draft"}
              </button>
              <p className="text-xs text-muted">Ctrl+S saves without changing the status.</p>
            </div>

            {post.id ? (
              <div className="mt-5 grid gap-3 border-t border-line pt-4">
                {postState === "published" ? (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-alpine-deep underline">
                    View live post
                  </a>
                ) : null}
                {pendingComments > 0 ? (
                  <Link href="/ops/comments" className="text-sm font-semibold text-alpine-deep underline">
                    {pendingComments} comment{pendingComments === 1 ? "" : "s"} waiting for moderation
                  </Link>
                ) : null}
                <DeletePostButton id={post.id} title={post.title || "this post"} redirectTo="/ops/blog" />
              </div>
            ) : null}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <label htmlFor={`${ids}-category`} className="font-display text-lg font-bold text-ink">
                Category
              </label>
              <Link href="/ops/blog/categories" className="text-sm font-semibold text-alpine-deep underline">
                Manage
              </Link>
            </div>
            <select
              id={`${ids}-category`}
              value={post.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
              aria-invalid={errors.categoryId ? true : undefined}
              className={`mt-3 ${inputClass} ${errors.categoryId ? "border-danger" : "border-line"}`}
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 ? <p className="mt-2 text-sm text-muted">No categories yet. Create them under Manage.</p> : null}
            <FieldError message={errors.categoryId} />

            <label htmlFor={`${ids}-tags`} className="mt-6 block font-display text-lg font-bold text-ink">
              Tags
            </label>
            {post.tags.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-canvas pl-3 text-sm font-semibold text-ink">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => update("tags", post.tags.filter((item) => item !== tag))}
                      aria-label={`Remove tag ${tag}`}
                      className="grid size-8 place-items-center rounded-full text-muted hover:text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <input
              id={`${ids}-tags`}
              value={tagDraft}
              onChange={(event) => {
                const value = event.target.value
                if (value.endsWith(",")) addTag(value.slice(0, -1))
                else setTagDraft(value)
              }}
              onKeyDown={onTagKeyDown}
              onBlur={() => {
                if (tagDraft) addTag(tagDraft)
              }}
              list={`${ids}-tag-suggestions`}
              disabled={post.tags.length >= BLOG_LIMITS.tags}
              placeholder={post.tags.length >= BLOG_LIMITS.tags ? `Limit of ${BLOG_LIMITS.tags} tags reached` : "Type a tag, press Enter"}
              aria-describedby={`${ids}-tags-hint`}
              className={`mt-3 ${inputClass} ${errors.tags ? "border-danger" : "border-line"}`}
            />
            <datalist id={`${ids}-tag-suggestions`}>
              {suggestionList.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p id={`${ids}-tags-hint`} className="mt-1 text-sm text-muted">
              Up to {BLOG_LIMITS.tags}. Reuse existing tags where possible: Ladakh, acclimatization, riding skills.
            </p>
            <FieldError message={errors.tags} />
          </Panel>

          <Panel>
            <h2 className="font-display text-lg font-bold text-ink">Featured image</h2>
            {post.featuredImageUrl ? (
              <div className="mt-3">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.featuredImageUrl} alt={post.featuredImageAlt || "Featured image preview"} className="h-full w-full object-cover" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPicker("featured")} className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:border-alpine">
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setPost((current) => ({ ...current, featuredImageUrl: "", featuredMediaId: "", featuredImageAlt: "" }))}
                    className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold text-danger hover:border-danger"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-4">
                  <Counter label="Alt text" htmlFor={`${ids}-alt`} length={post.featuredImageAlt.length} max={BLOG_LIMITS.imageAlt} />
                  <input
                    id={`${ids}-alt`}
                    value={post.featuredImageAlt}
                    onChange={(event) => update("featuredImageAlt", event.target.value)}
                    maxLength={BLOG_LIMITS.imageAlt}
                    placeholder="What the photo shows, e.g. Riders crossing a stream below Baralacha La"
                    aria-invalid={errors.featuredImageAlt ? true : undefined}
                    className={`mt-2 ${inputClass} ${errors.featuredImageAlt ? "border-danger" : "border-line"}`}
                  />
                  <FieldError message={errors.featuredImageAlt} />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPicker("featured")}
                className="mt-3 flex aspect-[16/10] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-canvas text-base font-semibold text-alpine-deep hover:border-alpine"
              >
                Choose from media library
                <span className="mt-1 text-sm font-normal text-muted">Shown on cards and social shares</span>
              </button>
            )}
            <FieldError message={errors.featuredImageUrl} />
          </Panel>
        </aside>
      </div>

      {picker ? (
        <MediaPickerModal
          assets={mediaAssets}
          accept="IMAGE"
          title={picker === "featured" ? "Choose the featured image" : "Insert an image"}
          description={picker === "featured" ? "Landscape photos at least 1600 px wide look best." : "The image is added where your cursor was, with its alt text."}
          confirmLabel={picker === "featured" ? "Use as featured image" : "Insert into article"}
          onConfirm={onPick}
          onClose={closePicker}
        />
      ) : null}
    </div>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-3xl border border-line bg-paper p-5 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-6">{children}</section>
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded px-2.5 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-alpine"
    >
      {children}
    </button>
  )
}

function Counter({ label, htmlFor, length, max }: { label: string; htmlFor: string; length: number; max: number }) {
  const over = length > max
  const near = length > max * 0.9
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <span className={`text-xs tabular-nums ${over ? "font-semibold text-danger" : near ? "text-amber-800" : "text-muted"}`} aria-live="polite">
        {length} / {max}
      </span>
    </div>
  )
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-sm text-danger" role="alert">
      {message}
    </p>
  )
}
