/**
 * Server-only sniff, disk, and duration helpers for the ops media library.
 * Images land in public/uploads/media/; videos in public/uploads/videos/.
 * Client components must import limits and formatters from `@/lib/media-format`.
 */
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

export type ImageKind = "jpg" | "png" | "webp"
export type VideoKind = "mp4" | "webm"

export function imageKindFromBytes(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp"
  }
  return null
}

export function videoKindFromBytes(bytes: Uint8Array, name: string): VideoKind | null {
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm"
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "mp4"
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext === "mp4" || ext === "m4v") return "mp4"
  if (ext === "webm") return "webm"
  return null
}

export function imageMime(kind: ImageKind): string {
  if (kind === "jpg") return "image/jpeg"
  if (kind === "png") return "image/png"
  return "image/webp"
}

export function videoMime(kind: VideoKind): string {
  return kind === "mp4" ? "video/mp4" : "video/webm"
}

export function uploadDir(kind: "image" | "video"): { abs: string; urlPrefix: string } {
  const folder = kind === "video" ? "videos" : "media"
  return {
    abs: path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", folder),
    urlPrefix: `/uploads/${folder}`,
  }
}

/** Resolve a stored public URL to a path under public/. Rejects traversal. */
export function publicUploadPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null
  const relative = url.replace(/^\/+/, "")
  if (relative.includes("..")) return null
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "public", ...relative.split("/"))
}

/**
 * Parse duration from an MP4 `mvhd` box in the file prefix.
 * Returns whole seconds, or null when the box is missing (common if `moov` is at the end).
 */
export function readMp4DurationSeconds(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let i = 0; i <= bytes.length - 24; i += 1) {
    if (bytes[i] !== 0x6d || bytes[i + 1] !== 0x76 || bytes[i + 2] !== 0x68 || bytes[i + 3] !== 0x64) continue
    const version = bytes[i + 4]
    try {
      if (version === 0) {
        const timescale = view.getUint32(i + 16)
        const duration = view.getUint32(i + 20)
        if (timescale > 0 && duration > 0) return Math.max(1, Math.round(duration / timescale))
      } else if (version === 1) {
        const timescale = view.getUint32(i + 24)
        const high = view.getUint32(i + 28)
        const low = view.getUint32(i + 32)
        const duration = high * 2 ** 32 + low
        if (timescale > 0 && duration > 0) return Math.max(1, Math.round(duration / timescale))
      }
    } catch {
      return null
    }
    return null
  }
  return null
}

const PREFIX_BYTES = 2 * 1024 * 1024

/**
 * Stream a File to disk without holding the whole video in RAM.
 * Returns the first ~2 MB so callers can parse MP4 duration from `mvhd`.
 */
export async function streamUploadToDisk(destPath: string, head: Uint8Array, reader: ReadableStreamDefaultReader<Uint8Array>): Promise<Uint8Array> {
  await mkdir(path.dirname(destPath), { recursive: true })
  const prefixChunks: Uint8Array[] = [head]
  let prefixLen = head.byteLength

  async function* chunks() {
    yield head
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      if (prefixLen < PREFIX_BYTES) {
        const take = Math.min(value.byteLength, PREFIX_BYTES - prefixLen)
        prefixChunks.push(value.subarray(0, take))
        prefixLen += take
      }
      yield value
    }
  }

  await pipeline(Readable.from(chunks()), createWriteStream(destPath))
  const prefix = new Uint8Array(prefixLen)
  let offset = 0
  for (const part of prefixChunks) {
    prefix.set(part, offset)
    offset += part.byteLength
  }
  return prefix
}
