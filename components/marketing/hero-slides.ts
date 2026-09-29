import type { HeroSlide } from "@/components/HeroSlider"
import type { ExpeditionCard } from "@/lib/catalog"
import { corridors } from "@/lib/content"

function publishedMatch(expeditions: ExpeditionCard[], keywords: readonly string[]) {
  return expeditions.find((expedition) =>
    keywords.some((keyword) =>
      `${expedition.title} ${expedition.regionName} ${expedition.summary}`.toLowerCase().includes(keyword),
    ),
  )
}

export function buildHeroSlides(expeditions: ExpeditionCard[]): HeroSlide[] {
  return corridors.map((corridor) => {
    const published = publishedMatch(expeditions, corridor.keywords)
    return {
      id: corridor.id,
      kicker: corridor.kicker,
      title: corridor.title,
      body: corridor.body,
      image: corridor.image,
      alt: corridor.alt,
      exploreHref: published ? `/expeditions/${published.slug}` : `/enquire?interest=${corridor.id}`,
      departuresHref: published ? `/expeditions/${published.slug}#departures` : "/expeditions",
    }
  })
}
