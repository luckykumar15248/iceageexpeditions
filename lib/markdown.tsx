/**
 * Safe Markdown subset for blog posts, shared by the public page and the ops preview.
 *
 * Output is React elements only (no dangerouslySetInnerHTML), so author text can never
 * inject markup. Links and images pass an allow-list: http(s), mailto, site-relative paths.
 *
 * Blocks:  ## H2, ### H3, #### H4, paragraphs, - / 1. lists, > quotes, ``` code,
 *          --- rules, and ![alt](src "caption") on its own line.
 * Inline:  **bold**, *italic*, `code`, [text](href).
 */
import type { ReactNode } from "react"

export type MarkdownHeading = { id: string; text: string; level: 2 | 3 }

type Block =
  | { kind: "heading"; level: 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "image"; alt: string; src: string; caption: string }
  | { kind: "code"; text: string }
  | { kind: "hr" }

const HEADING = /^(#{1,4})\s+(.+?)\s*#*$/
const RULE = /^(-{3,}|\*{3,}|_{3,})$/
const IMAGE = /^!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)$/
const UNORDERED = /^[-*+]\s+(.*)$/
const ORDERED = /^\d+[.)]\s+(.*)$/
const INLINE = /\*\*(.+?)\*\*|\*([^*\s][^*]*?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("```") ||
    line.startsWith(">") ||
    HEADING.test(line) ||
    RULE.test(line) ||
    IMAGE.test(line) ||
    UNORDERED.test(line) ||
    ORDERED.test(line)
  )
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line === "") {
      i += 1
      continue
    }
    if (line.startsWith("```")) {
      const body: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ kind: "code", text: body.join("\n") })
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      const hashes = heading[1].length
      blocks.push({ kind: "heading", level: hashes <= 2 ? 2 : hashes === 3 ? 3 : 4, text: heading[2] })
      i += 1
      continue
    }
    if (RULE.test(line)) {
      blocks.push({ kind: "hr" })
      i += 1
      continue
    }
    const image = IMAGE.exec(line)
    if (image) {
      blocks.push({ kind: "image", alt: image[1], src: image[2], caption: image[3] ?? "" })
      i += 1
      continue
    }
    if (line.startsWith(">")) {
      const body: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        body.push(lines[i].trim().replace(/^>\s?/, ""))
        i += 1
      }
      blocks.push({ kind: "quote", text: body.join(" ") })
      continue
    }
    if (UNORDERED.test(line) || ORDERED.test(line)) {
      const ordered = ORDERED.test(line)
      const pattern = ordered ? ORDERED : UNORDERED
      const items: string[] = []
      while (i < lines.length) {
        const current = lines[i].trim()
        const match = pattern.exec(current)
        if (match) {
          items.push(match[1])
          i += 1
          continue
        }
        if (current !== "" && items.length > 0 && /^\s{2,}/.test(lines[i]) && !isBlockStart(current)) {
          items[items.length - 1] += ` ${current}`
          i += 1
          continue
        }
        break
      }
      blocks.push({ kind: "list", ordered, items })
      continue
    }
    const body = [line]
    i += 1
    while (i < lines.length) {
      const current = lines[i].trim()
      if (current === "" || isBlockStart(current)) break
      body.push(current)
      i += 1
    }
    blocks.push({ kind: "paragraph", text: body.join(" ") })
  }
  return blocks
}

export function safeHref(raw: string): string | null {
  const value = raw.trim()
  if (/^(https?:\/\/|mailto:)/i.test(value)) return value
  if (value.startsWith("/") && !value.startsWith("//")) return value
  if (value.startsWith("#")) return value
  return null
}

export function safeImageSrc(raw: string): string | null {
  const value = raw.trim()
  if (/^https:\/\//i.test(value)) return value
  if (value.startsWith("/") && !value.startsWith("//")) return value
  return null
}

function inlinePlain(text: string): string {
  let result = text
  for (let pass = 0; pass < 3; pass += 1) {
    result = result.replace(INLINE, (_m, bold?: string, em?: string, code?: string, label?: string) => bold ?? em ?? code ?? label ?? "")
  }
  return result
}

function renderInline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    const k = `${key}-${n}`
    n += 1
    const [whole, bold, em, code, label, href] = match
    if (bold !== undefined) {
      out.push(<strong key={k} className="font-semibold text-ink">{renderInline(bold, k)}</strong>)
    } else if (em !== undefined) {
      out.push(<em key={k}>{renderInline(em, k)}</em>)
    } else if (code !== undefined) {
      out.push(
        <code key={k} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[0.9em] text-ink">
          {code}
        </code>,
      )
    } else if (label !== undefined && href !== undefined) {
      const safe = safeHref(href)
      if (!safe) {
        out.push(whole)
      } else {
        const external = /^https?:\/\//i.test(safe)
        out.push(
          <a
            key={k}
            href={safe}
            className="font-semibold text-alpine-deep underline decoration-alpine/40 underline-offset-4 hover:decoration-alpine-deep"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {renderInline(label, k)}
          </a>,
        )
      }
    }
    last = start + whole.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "section"
  )
}

export function renderMarkdown(source: string): { content: ReactNode; headings: MarkdownHeading[] } {
  const blocks = parseBlocks(source)
  const headings: MarkdownHeading[] = []
  const usedIds = new Map<string, number>()

  const nodes = blocks.map((block, index) => {
    const key = `b${index}`
    switch (block.kind) {
      case "heading": {
        const plain = inlinePlain(block.text)
        const base = slugifyHeading(plain)
        const seen = usedIds.get(base) ?? 0
        usedIds.set(base, seen + 1)
        const id = seen === 0 ? base : `${base}-${seen + 1}`
        if (block.level === 2) {
          headings.push({ id, text: plain, level: 2 })
          return (
            <h2 key={key} id={id} className="mt-12 scroll-mt-28 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {renderInline(block.text, key)}
            </h2>
          )
        }
        if (block.level === 3) {
          headings.push({ id, text: plain, level: 3 })
          return (
            <h3 key={key} id={id} className="mt-10 scroll-mt-28 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {renderInline(block.text, key)}
            </h3>
          )
        }
        return (
          <h4 key={key} id={id} className="mt-8 scroll-mt-28 font-display text-lg font-bold tracking-tight text-ink">
            {renderInline(block.text, key)}
          </h4>
        )
      }
      case "paragraph":
        return (
          <p key={key} className="mt-6 text-lg leading-8 text-ink">
            {renderInline(block.text, key)}
          </p>
        )
      case "list": {
        const items = block.items.map((item, itemIndex) => (
          <li key={`${key}-${itemIndex}`} className="pl-1">
            {renderInline(item, `${key}-${itemIndex}`)}
          </li>
        ))
        return block.ordered ? (
          <ol key={key} className="mt-6 list-decimal space-y-2 pl-6 text-lg leading-8 text-ink marker:font-semibold marker:text-alpine-deep">
            {items}
          </ol>
        ) : (
          <ul key={key} className="mt-6 list-disc space-y-2 pl-6 text-lg leading-8 text-ink marker:text-alpine">
            {items}
          </ul>
        )
      }
      case "quote":
        return (
          <blockquote key={key} className="mt-8 rounded-r-2xl border-l-4 border-alpine bg-alpine-soft/50 px-6 py-5 text-lg leading-8 text-ink italic">
            {renderInline(block.text, key)}
          </blockquote>
        )
      case "image": {
        const src = safeImageSrc(block.src)
        if (!src) return null
        return (
          <figure key={key} className="mt-10">
            {/* Body images come from the media library or https hosts with unknown dimensions. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={block.alt} loading="lazy" decoding="async" className="w-full rounded-2xl border border-line bg-canvas object-cover" />
            {block.caption ? <figcaption className="mt-3 text-sm leading-relaxed text-muted">{block.caption}</figcaption> : null}
          </figure>
        )
      }
      case "code":
        return (
          <pre key={key} className="mt-6 overflow-x-auto rounded-2xl border border-line bg-canvas p-4 font-mono text-sm leading-relaxed text-ink">
            <code>{block.text}</code>
          </pre>
        )
      case "hr":
        return <hr key={key} className="my-12 border-line" />
    }
  })

  return { content: <div className="[&>*:first-child]:mt-0">{nodes}</div>, headings }
}

export function markdownToPlainText(source: string): string {
  return parseBlocks(source)
    .map((block) => {
      switch (block.kind) {
        case "heading":
        case "paragraph":
        case "quote":
          return inlinePlain(block.text)
        case "list":
          return block.items.map(inlinePlain).join(" ")
        case "image":
          return block.caption || block.alt
        case "code":
          return block.text
        case "hr":
          return ""
      }
    })
    .filter((part) => part.length > 0)
    .join("\n\n")
}

const WORDS_PER_MINUTE = 200

export function readingMinutesFor(source: string): number {
  const words = markdownToPlainText(source).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
