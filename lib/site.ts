export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const url = configured && configured.length > 0 ? configured : "http://localhost:3000"
  return url.replace(/\/$/, "")
}

export const siteName = "Ice Age Expeditions"

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: getSiteUrl(),
    description:
      "Guided Himalayan 4x4 SUV and motorbike expeditions with dated departures, support vehicles, and altitude-aware itineraries.",
    slogan: "The Era of Trails",
  }
}
