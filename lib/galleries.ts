/**
 * Gallery data access.
 *
 * The cross-request cache uses tag "gallery" so that gallery mutations
 * (add, remove, reorder) bust it immediately via revalidateTag("gallery", "seconds").
 */
import { unstable_cache } from "next/cache"
import { connection } from "next/server"
import { getPrisma } from "@/lib/db"

export type PublicGalleryItem = {
  id: string
  caption: string | null
  category: string | null
  mediaUrl: string
  mimeType: string
  assetType: "IMAGE" | "VIDEO"
  altText: string | null
  durationSeconds: number | null
}

export type CmsGalleryItem = PublicGalleryItem & {
  sortOrder: number
  active: boolean
  mediaAssetId: string
  originalName: string
  sizeBytes: number
  createdAt: Date
  updatedAt: Date
}

const _loadPublicGallery = unstable_cache(
  async (): Promise<PublicGalleryItem[]> => {
    const prisma = getPrisma()
    const rows = await prisma.galleryItem.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { mediaAsset: true },
    })
    return rows.map((row) => ({
      id: row.id,
      caption: row.caption,
      category: row.category,
      mediaUrl: row.mediaAsset.url,
      mimeType: row.mediaAsset.mimeType,
      assetType: row.mediaAsset.assetType,
      altText: row.mediaAsset.altText,
      durationSeconds: row.mediaAsset.durationSeconds,
    }))
  },
  ["gallery-public"],
  { revalidate: 120, tags: ["gallery"] },
)

export async function getPublicGallery(): Promise<PublicGalleryItem[] | "offline"> {
  await connection()
  try {
    return await _loadPublicGallery()
  } catch (err) {
    console.error("[gallery] public fetch failed:", err instanceof Error ? err.message : String(err))
    return "offline"
  }
}

export async function loadCmsGallery(): Promise<CmsGalleryItem[] | "offline"> {
  try {
    const prisma = getPrisma()
    const rows = await prisma.galleryItem.findMany({
      orderBy: { sortOrder: "asc" },
      include: { mediaAsset: true },
    })
    return rows.map((row) => ({
      id: row.id,
      caption: row.caption,
      category: row.category,
      mediaUrl: row.mediaAsset.url,
      mimeType: row.mediaAsset.mimeType,
      assetType: row.mediaAsset.assetType,
      altText: row.mediaAsset.altText,
      durationSeconds: row.mediaAsset.durationSeconds,
      sortOrder: row.sortOrder,
      active: row.active,
      mediaAssetId: row.mediaAssetId,
      originalName: row.mediaAsset.originalName,
      sizeBytes: row.mediaAsset.sizeBytes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  } catch (err) {
    console.error("[gallery] CMS fetch failed:", err instanceof Error ? err.message : String(err))
    return "offline"
  }
}
