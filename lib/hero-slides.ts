/**
 * Hero slide data access.
 *
 * Design rules:
 * - The cached function (_loadActiveSlides) throws on DB errors so that
 *   unstable_cache never stores an error state. Only a successful
 *   PublicHeroSlide[] is persisted across requests.
 * - The public getActiveHeroSlides() catches at the call site and returns
 *   "offline" so the homepage can fall back to static slides without
 *   crashing the render.
 * - Tags: all writes call revalidateTag("hero-slides", "seconds") which
 *   immediately busts this cache and marks the homepage for revalidation.
 */
import { unstable_cache } from "next/cache"
import { connection } from "next/server"
import { getPrisma } from "@/lib/db"
import type { HeroSlide as HeroSlideRow } from "@/app/generated/prisma/client"

export type PublicHeroSlide = {
  id: string
  kicker: string
  title: string
  body: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string | null
  secondaryHref: string | null
  imageUrl: string
  imageAlt: string
  /** Optional background video URL. When present the slider renders a muted autoplay loop. */
  videoUrl: string | null
}

export type CmsHeroSlide = PublicHeroSlide & {
  sortOrder: number
  active: boolean
  mediaAssetId: string | null
  createdAt: Date
  updatedAt: Date
}

function toPublic(row: HeroSlideRow): PublicHeroSlide {
  return {
    id: row.id,
    kicker: row.kicker,
    title: row.title,
    body: row.body,
    primaryLabel: row.primaryLabel,
    primaryHref: row.primaryHref,
    secondaryLabel: row.secondaryLabel,
    secondaryHref: row.secondaryHref,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    videoUrl: row.videoUrl,
  }
}

function toCms(row: HeroSlideRow): CmsHeroSlide {
  return {
    ...toPublic(row),
    sortOrder: row.sortOrder,
    active: row.active,
    mediaAssetId: row.mediaAssetId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Cross-request cache keyed on ["hero-slides-public"].
 * Returns PublicHeroSlide[] or THROWS — never returns "offline".
 * Errors are not cached by unstable_cache, only successful arrays are.
 * Tag "hero-slides" lets server actions bust this immediately.
 */
const _loadActiveSlides = unstable_cache(
  async (): Promise<PublicHeroSlide[]> => {
    const prisma = getPrisma()
    const rows = await prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    })
    return rows.map(toPublic)
  },
  ["hero-slides-public"],
  { revalidate: 60, tags: ["hero-slides"] },
)

/**
 * Load active hero slides for the public homepage.
 * - connection() ensures this never runs in a static prerender build.
 * - Returns "offline" only when the DB is unreachable; the homepage then
 *   falls back to the auto-built expedition catalog slides.
 */
export async function getActiveHeroSlides(): Promise<PublicHeroSlide[] | "offline"> {
  await connection()
  try {
    return await _loadActiveSlides()
  } catch (err) {
    // Log for diagnostics but never crash the public homepage.
    console.error("[hero-slides] public fetch failed:", err instanceof Error ? err.message : String(err))
    return "offline"
  }
}

/** Load all slides (active and inactive) for the ops CMS console. */
export async function loadCmsHeroSlides(): Promise<CmsHeroSlide[] | "offline"> {
  try {
    const prisma = getPrisma()
    const rows = await prisma.heroSlide.findMany({
      orderBy: { sortOrder: "asc" },
    })
    return rows.map(toCms)
  } catch (err) {
    console.error("[hero-slides] CMS fetch failed:", err instanceof Error ? err.message : String(err))
    return "offline"
  }
}
