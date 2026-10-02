import { getPrisma } from "@/lib/db"

export type MediaAssetRow = {
  id: string
  /** "IMAGE" or "VIDEO" — drives how thumbnails and pickers render. */
  assetType: "IMAGE" | "VIDEO"
  filename: string
  originalName: string
  url: string
  mimeType: string
  sizeBytes: number
  /** Whole seconds for videos; null for images. */
  durationSeconds: number | null
  altText: string | null
  uploadedByStaffId: string
  uploaderName: string
  createdAt: Date
}

export async function loadMediaAssets(): Promise<MediaAssetRow[] | "offline"> {
  try {
    const prisma = getPrisma()
    const rows = await prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      assetType: row.assetType,
      filename: row.filename,
      originalName: row.originalName,
      url: row.url,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      durationSeconds: row.durationSeconds,
      altText: row.altText,
      uploadedByStaffId: row.uploadedByStaffId,
      uploaderName: row.uploadedBy.name,
      createdAt: row.createdAt,
    }))
  } catch {
    return "offline"
  }
}
