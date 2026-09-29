import { HeroSlider } from "@/components/HeroSlider";
import { CorridorGrid } from "@/components/marketing/corridor-grid";
import { ExpeditionCardView } from "@/components/marketing/expedition-card";
import { corridorSlides, departureSlides } from "@/components/marketing/expedition-slides";
import { HeroSearch } from "@/components/marketing/hero-search";
import { buildHeroSlides } from "@/components/marketing/hero-slides";
import { PrivateGroupBanner } from "@/components/marketing/private-group-banner";
import { TrailLogs } from "@/components/marketing/trail-logs";
import { TrustPoints } from "@/components/marketing/trust-points";
import { ExpeditionSlider } from "@/components/ExpeditionSlider";
import { getCatalog, listUpcomingDepartures } from "@/lib/catalog";
import { preload } from "react-dom";

export const revalidate = 60;

export default async function HomePage() {
  const [catalog, upcoming] = await Promise.all([getCatalog({}), listUpcomingDepartures()]);
  const heroSlides = buildHeroSlides(catalog.status === "ok" ? catalog.expeditions : []);
  const leadImage = heroSlides[0]?.image;
  if (leadImage) preload(leadImage, { as: "image", fetchPriority: "high" });
  const liveSlides = upcoming === "offline" || upcoming.length === 0 ? [] : departureSlides(upcoming);
  const routeSlides = corridorSlides(catalog.status === "ok" ? catalog.expeditions : []);
  const sliderSlides = liveSlides.length > 0 ? liveSlides : routeSlides;
  const sliderIsLive = liveSlides.length > 0;
  const featured =
    catalog.status === "ok"
      ? [
          ...catalog.expeditions.filter((item) => item.availability === "open" || item.availability === "limited"),
          ...catalog.expeditions,
        ]
          .filter((item, index, list) => list.findIndex((candidate) => candidate.slug === item.slug) === index)
          .slice(0, 3)
      : [];

  return (
    <>
      <HeroSlider
        slides={heroSlides}
        search={
          <>
            <HeroSearch
              regions={catalog.status === "ok" ? catalog.regions : []}
              seasons={catalog.status === "ok" ? catalog.seasons : []}
            />
            {catalog.status === "offline" ? (
              <p className="mt-4 text-lg text-muted">
                Published region names load when the route book is online. Signature corridors still open an enquiry.
              </p>
            ) : null}
          </>
        }
      />

      <section className="bg-paper text-ink" aria-labelledby="corridors-heading">
        <div className="h-1 bg-alpine" aria-hidden="true" />
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="flex items-center gap-3 text-base font-semibold tracking-[0.16em] text-alpine uppercase">
            <span className="h-px w-10 bg-alpine" aria-hidden="true" />
            Uncompromising trails · Signature expeditions
          </p>
          <h2 id="corridors-heading" className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            Winter Spiti, Zanskar, and the Manali–Leh passes
          </h2>
          <p className="mt-5 max-w-3xl text-xl text-muted">
            Days, altitude, and difficulty appear when a route is published. Until then the card is an invitation to
            ask, not a confirmed crossing.
          </p>
          <div className="mt-12">
            <CorridorGrid expeditions={catalog.status === "ok" ? catalog.expeditions : []} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="why-heading">
        <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Why ride with Ice Age</p>
        <h2 id="why-heading" className="mt-3 max-w-4xl font-display text-4xl font-bold text-ink sm:text-6xl">
          The convoy, the truck, and the night’s altitude
        </h2>
        <div className="mt-10">
          <TrustPoints />
        </div>
      </section>

      <section className="border-y border-line bg-paper" aria-labelledby="upcoming-heading">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">{sliderIsLive ? "Open dates" : "Signature routes"}</p>
              <h2 id="upcoming-heading" className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
                {sliderIsLive ? "Upcoming departures" : "Winter Spiti, Zanskar, and Ladakh"}
              </h2>
            </div>
            <p className="max-w-md text-lg text-muted">
              {sliderIsLive
                ? "Remaining places and INR prices come from the route book. Book slot sends a request, not a payment."
                : "These corridors stay on the slider until a dated departure is published. Duration and altitude appear with that route."}
              {upcoming === "offline" ? " Live dates are offline right now." : ""}
            </p>
          </div>
          <div className="mt-8">
            <ExpeditionSlider
              label={sliderIsLive ? "Upcoming departures" : "Featured Himalayan routes"}
              slides={sliderSlides}
              autoPlay
            />
          </div>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="featured-heading">
          <h2 id="featured-heading" className="font-display text-4xl font-bold text-ink sm:text-5xl">
            Published now
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((expedition) => (
              <ExpeditionCardView key={expedition.slug} expedition={expedition} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="logs-heading">
        <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Trail logs</p>
        <h2 id="logs-heading" className="mt-3 max-w-4xl font-display text-4xl font-bold text-ink sm:text-6xl">
          What we tell a rider before the first pass
        </h2>
        <div className="mt-10">
          <TrailLogs />
        </div>
      </section>

      <PrivateGroupBanner />
    </>
  );
}
