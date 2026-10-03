/**
 * Serves staff uploads from mediaRoot() at request time.
 *
 * `next start` indexes public/ once at boot, so files uploaded afterwards 404 until a restart.
 * This handler reads the disk per request. Nginx may serve the same directory directly and fall
 * back here. Supports Range requests (Safari and iOS will not play video without 206 responses).
 */
import { createReadStream, type ReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { publicUploadPath, servableMime } from "@/lib/media-file"

const IMMUTABLE = "public, max-age=31536000, immutable"

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } })
}

function toWebStream(node: ReadStream): ReadableStream<Uint8Array> {
  const iterator = node[Symbol.asyncIterator]()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next()
        if (done) controller.close()
        else controller.enqueue(value)
      } catch (error) {
        controller.error(error)
      }
    },
    cancel() {
      node.destroy()
    },
  })
}

type ByteRange = { start: number; end: number } | "unsatisfiable" | null

function parseRange(header: string | null, size: number): ByteRange {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match
  if (rawStart === "" && rawEnd === "") return null
  let start: number
  let end: number
  if (rawStart === "") {
    const suffix = Number(rawEnd)
    if (suffix === 0) return "unsatisfiable"
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1)
  }
  if (start >= size || start > end) return "unsatisfiable"
  return { start, end }
}

async function serve(request: Request, segments: string[], withBody: boolean): Promise<Response> {
  const filePath = publicUploadPath(`/uploads/${segments.join("/")}`)
  if (!filePath) return notFound()
  const mime = servableMime(filePath)
  if (!mime) return notFound()

  let size: number
  let mtime: Date
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return notFound()
    size = info.size
    mtime = info.mtime
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      console.error("[uploads] stat failed", { code: code || "UNKNOWN" })
    }
    return notFound()
  }

  const etag = `W/"${size.toString(16)}-${Math.floor(mtime.getTime() / 1000).toString(16)}"`
  const baseHeaders: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": IMMUTABLE,
    ETag: etag,
    "Last-Modified": mtime.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  }

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: baseHeaders })
  }

  const range = parseRange(request.headers.get("range"), size)
  if (range === "unsatisfiable") {
    return new Response(null, { status: 416, headers: { ...baseHeaders, "Content-Range": `bytes */${size}` } })
  }

  if (range) {
    const length = range.end - range.start + 1
    const headers = { ...baseHeaders, "Content-Length": String(length), "Content-Range": `bytes ${range.start}-${range.end}/${size}` }
    const body = withBody ? toWebStream(createReadStream(filePath, { start: range.start, end: range.end })) : null
    return new Response(body, { status: 206, headers })
  }

  const body = withBody ? toWebStream(createReadStream(filePath)) : null
  return new Response(body, { status: 200, headers: { ...baseHeaders, "Content-Length": String(size) } })
}

type UploadContext = { params: Promise<{ path: string[] }> }

export async function GET(request: Request, ctx: UploadContext): Promise<Response> {
  const { path } = await ctx.params
  return serve(request, path, true)
}

export async function HEAD(request: Request, ctx: UploadContext): Promise<Response> {
  const { path } = await ctx.params
  return serve(request, path, false)
}
