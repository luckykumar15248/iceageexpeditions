import type { ExpeditionSlide } from "@/components/ExpeditionSlider"
import { corridors } from "@/lib/content"
import type { ExpeditionCard, UpcomingDepartureCard } from "@/lib/catalog"

export function departureSlides(departures: UpcomingDepartureCard[]): ExpeditionSlide[] {
  return departures.map((departure) => ({
    id: departure.id,
    title: departure.title,
    href: `/booking/${departure.id}`,
    cta: "Book slot",
    imageUrl: departure.heroImageUrl,
    imageAlt: departure.heroAlt,
    eyebrow: departure.vehicleLabel,
    badges: [
      { label: `${departure.startLabel} – ${departure.endLabel}` },
      { label: departure.placesNote },
      { label: departure.priceLabel },
    ],
    note: "A request. Payment is not taken here.",
  }))
}

export function corridorSlides(expeditions: ExpeditionCard[]): ExpeditionSlide[] {
  return corridors.map((corridor) => {
    const published = expeditions.find((expedition) =>
      corridor.keywords.some((keyword) =>
        `${expedition.title} ${expedition.regionName} ${expedition.summary}`.toLowerCase().includes(keyword),
      ),
    )
    return {
      id: corridor.id,
      title: corridor.title,
      href: published ? `/expeditions/${published.slug}` : `/enquire?interest=${corridor.id}`,
      cta: published ? "View itinerary" : "Ask ops",
      imageUrl: corridor.image,
      imageAlt: corridor.alt,
      eyebrow: corridor.kicker,
      badges: published
        ? [
            { label: `${published.durationDays} days` },
            { label: `${published.maxAltitudeMeters.toLocaleString("en-IN")} m` },
            { label: published.difficultyLabel },
            { label: published.fromPriceLabel ?? "Price on enquiry" },
          ]
        : [{ label: "Duration on request" }, { label: "Altitude on the itinerary" }],
      note: corridor.body,
    }
  })
}
