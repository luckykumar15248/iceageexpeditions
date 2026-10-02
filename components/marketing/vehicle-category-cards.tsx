import { ExpeditionImage } from "@/components/expedition-image"
import Link from "next/link"

const categories = [
  {
    href: "/expeditions?vehicle=SUV_4X4",
    title: "4x4 SUV expeditions",
    body: "Supported rides in a guided convoy. Dated departures, a crew, and seats that are counted.",
    image: "/imagery/suv-high-road.svg",
    alt: "A 4x4 SUV on a high Himalayan road with the support convoy",
  },
  {
    href: "/expeditions?vehicle=MOTORBIKE",
    title: "Custom motorbike trails",
    body: "Self-ride groups with a support vehicle, or a private trail quoted only when the window is real.",
    image: "/imagery/motorbike-high-road.svg",
    alt: "A motorbike on a high Himalayan road with support in the convoy",
  },
] as const

export function VehicleCategoryCards() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {categories.map((category) => (
        <Link
          key={category.href}
          href={category.href}
          className="group overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(14,122,70,0.16)]"
        >
          <div className="relative aspect-[16/8] overflow-hidden bg-line">
            <ExpeditionImage src={category.image} alt={category.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 ease-out group-hover:scale-105" />
          </div>
          <div className="p-8">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl group-hover:text-alpine">{category.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted">{category.body}</p>
            <span className="mt-5 inline-flex text-base font-medium text-alpine-deep">Browse this vehicle</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
