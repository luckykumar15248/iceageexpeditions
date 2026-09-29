import type { Metadata } from "next";
import { ExpeditionImage } from "@/components/expedition-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DepartureBoard } from "@/components/marketing/departure-board";
import { EnquiryForm } from "@/components/marketing/enquiry-form";
import { ExpeditionSubnav } from "@/components/marketing/expedition-subnav";
import { ItineraryTimeline } from "@/components/marketing/itinerary-timeline";
import { JsonLd } from "@/components/marketing/json-ld";
import { OfflineNote } from "@/components/marketing/offline-note";
import { riderGear, suvGear } from "@/lib/content";
import { getExpeditionDetail } from "@/lib/catalog";
import { metaDescription } from "@/lib/format";
import { getSiteUrl } from "@/lib/site";
import { preload } from "react-dom";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/expeditions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const expedition = await getExpeditionDetail(slug);
  if (expedition === "offline") return { title: "Route book offline" };
  if (!expedition) return { title: "Expedition" };
  const description = expedition.metaDescription?.trim() || metaDescription(
    `${expedition.vehicleLabel} · ${expedition.durationDays} days · ${expedition.maxAltitudeMeters} m. ${expedition.summary}`,
  );
  const title = expedition.metaTitle?.trim() || `${expedition.title} · ${expedition.durationDays} days`;
  const socialTitle = expedition.ogTitle?.trim() || expedition.title;
  const socialDescription = expedition.ogDescription?.trim() || description;
  const socialImage = expedition.ogImageUrl?.trim() || expedition.heroImageUrl;
  const keywords = expedition.focusKeywords
    ?.split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
  return {
    title,
    description,
    keywords,
    robots: { index: expedition.robotsIndex, follow: expedition.robotsFollow },
    alternates: { canonical: `/expeditions/${expedition.slug}` },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      images: [{ url: socialImage, alt: expedition.ogImageAlt?.trim() || expedition.heroAlt }],
    },
  };
}

export default async function ExpeditionPage({ params }: PageProps<"/expeditions/[slug]">) {
  const { slug } = await params;
  const expedition = await getExpeditionDetail(slug);
  if (expedition === "offline") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <OfflineNote page title="This route could not be loaded" />
      </div>
    );
  }
  if (!expedition) notFound();

  const bookable = expedition.departures.find((departure) => departure.bookable);
  const gear = expedition.vehicleClass === "MOTORBIKE" ? riderGear.ride : suvGear.drive;
  const site = getSiteUrl();
  preload(expedition.heroImageUrl, { as: "image", fetchPriority: "high" });

  return (
    <article className="pb-24 md:pb-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: expedition.title,
          description: expedition.metaDescription?.trim() || expedition.summary,
          touristType: expedition.vehicleLabel,
          url: `${site}/expeditions/${expedition.slug}`,
          image: expedition.ogImageUrl?.trim() || expedition.heroImageUrl,
          itinerary: {
            "@type": "ItemList",
            itemListElement: expedition.days.map((day) => ({
              "@type": "ListItem",
              position: day.dayNumber,
              name: `Day ${day.dayNumber}: ${day.title}`,
              description: day.body,
            })),
          },
          ...(expedition.fromPricePaisa != null && bookable
            ? {
                offers: {
                  "@type": "Offer",
                  priceCurrency: "INR",
                  price: (expedition.fromPricePaisa / 100).toFixed(2),
                  availability: "https://schema.org/InStock",
                  url: `${site}/booking/${bookable.id}`,
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: site },
            { "@type": "ListItem", position: 2, name: "Expeditions", item: `${site}/expeditions` },
            {
              "@type": "ListItem",
              position: 3,
              name: expedition.title,
              item: `${site}/expeditions/${expedition.slug}`,
            },
          ],
        }}
      />

      <header className="bg-canvas">
        <div className="relative h-[46vh] min-h-[18rem] overflow-hidden bg-line">
          <ExpeditionImage
            src={expedition.heroImageUrl}
            alt={expedition.heroAlt}
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas to-transparent" />
        </div>
        <div className="relative z-10 mx-auto -mt-16 w-full max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl border border-line bg-paper px-6 py-8 shadow-[0_18px_50px_rgba(26,29,27,0.08)] sm:px-10 sm:py-12">
            <nav aria-label="Breadcrumb" className="text-lg text-muted">
              <Link href="/" className="font-semibold text-alpine-deep hover:underline">
                Home
              </Link>
              <span aria-hidden="true"> / </span>
              <Link href="/expeditions" className="font-semibold text-alpine-deep hover:underline">
                Expeditions
              </Link>
              <span aria-hidden="true"> / </span>
              <span className="text-ink">{expedition.title}</span>
            </nav>
            <p className="mt-5 text-base font-semibold tracking-[0.14em] text-alpine uppercase">
              {expedition.vehicleLabel} · {expedition.regionName} · {expedition.seasonLabel}
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-5xl leading-tight font-bold text-ink sm:text-7xl">
              {expedition.title}
            </h1>
            <p className="mt-5 max-w-3xl text-xl leading-relaxed text-muted">{expedition.summary}</p>
          </div>
        </div>
      </header>

      <ExpeditionSubnav
        bookHref={bookable ? `/booking/${bookable.id}` : "#enquire"}
        bookLabel={bookable ? "Request to book" : "Request a quote"}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <section id="overview" className="scroll-mt-40">
          <h2 className="sr-only">Overview</h2>
          <dl className="grid grid-cols-2 gap-8 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:grid-cols-4">
            <Stat label="Duration" value={`${expedition.durationDays} days`} />
            <Stat label="Max altitude" value={`${expedition.maxAltitudeMeters.toLocaleString("en-IN")} m`} />
            <Stat label="Difficulty" value={expedition.difficultyLabel} />
            <Stat label="Vehicle" value={expedition.vehicleLabel} />
          </dl>
          <p className="mt-5 text-lg text-muted">
            Planned time rolling: {expedition.movingHoursLabel}. Road distance is not a single number. Washouts move the
            line.
          </p>
        </section>

        {expedition.gallery.length > 0 ? (
          <section className="mt-16" aria-labelledby="gallery-heading">
            <h2 id="gallery-heading" className="font-display text-4xl font-bold text-ink sm:text-5xl">
              On the road
            </h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {expedition.gallery.map((image, index) => (
                <li key={`${image.url}-${index}`} className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-line bg-line">
                  <ExpeditionImage src={image.url} alt={image.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-16 scroll-mt-40" id="itinerary" aria-labelledby="itinerary-heading">
          <h2 id="itinerary-heading" className="font-display text-4xl font-bold text-ink sm:text-5xl">
            Day by day
          </h2>
          <ItineraryTimeline days={expedition.days} />
        </section>

        <div className="mt-14">
          <DepartureBoard departures={expedition.departures} vehicleLabel={expedition.vehicleLabel} />
        </div>

        <section id="inclusions" className="mt-16 scroll-mt-40" aria-labelledby="inclusions-heading">
          <h2 id="inclusions-heading" className="font-display text-4xl font-bold text-ink sm:text-5xl">
            What the price covers
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <ListBlock title="Included" items={expedition.inclusions} fallback={expedition.inclusionText} />
            <ListBlock title="Not included" items={expedition.exclusions} fallback={expedition.exclusionText} tone="plain" />
          </div>
        </section>

        <section id="gear" className="mt-16 scroll-mt-40" aria-labelledby="gear-heading">
          <h2 id="gear-heading" className="font-display text-4xl font-bold text-ink sm:text-5xl">
            Gear for this {expedition.vehicleLabel.toLowerCase()} expedition
          </h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-lg text-muted">
            {gear.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link href="/gear" className="mt-6 inline-flex text-lg font-semibold text-alpine-deep underline">
            Open the full packing guide
          </Link>
        </section>

        <section id="permits" className="mt-16 scroll-mt-40 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]" aria-labelledby="permits-heading">
          <h2 id="permits-heading" className="font-display text-4xl font-bold text-ink">
            Safety and permits
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted">
            <p>
              Inner Line and Protected Area permits depend on nationality, the route, and the current local order. Ops
              confirms the window for each departure. This page is not a legal opinion.
            </p>
            <p>
              Snow, washouts, and administrative closures can shut a pass after a deposit. The itinerary is the plan,
              not a guarantee that every col will be open.
            </p>
            <p>
              Every traveler submits a fitness self-declaration and an emergency contact. That note is not a doctor’s
              clearance. Altitude illness can start well below the highest point on the route.
            </p>
            {expedition.supportVehicleIncluded ? (
              <p>A support vehicle runs with this expedition unless a specific departure says otherwise.</p>
            ) : null}
            {expedition.permitNotes ? <p>{expedition.permitNotes}</p> : null}
          </div>
          <Link href="/safety" className="mt-6 inline-flex text-lg font-semibold text-alpine-deep underline">
            Read the safety notes
          </Link>
        </section>

        <div id="enquire" className="mt-14 scroll-mt-36">
          {bookable ? null : (
            <p className="mb-4 text-lg text-ink">No departure is open. Send an enquiry or join a waitlist.</p>
          )}
          <EnquiryForm
            expeditionId={expedition.id}
            vehicleClass={expedition.vehicleClass}
            heading={bookable ? "Ask about this route" : "Request a quote"}
            departures={expedition.departures.map((departure) => ({
              id: departure.id,
              label: `${departure.startLabel} · ${departure.statusLabel}`,
            }))}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper px-4 py-3 shadow-[0_-8px_24px_rgba(26,29,27,0.08)] lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-2xl font-bold text-ink">{expedition.fromPriceLabel ?? "Enquire"}</p>
          {bookable ? (
            <Link href={`/booking/${bookable.id}`} className="inline-flex min-h-14 items-center rounded-md bg-alpine px-5 text-lg font-semibold text-white">
              Request to book
            </Link>
          ) : (
            <a href="#enquire" className="inline-flex min-h-14 items-center rounded-md bg-alpine px-5 text-lg font-semibold text-white">
              Request a quote
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-base font-semibold tracking-[0.12em] text-alpine uppercase">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-bold text-ink">{value}</dd>
    </div>
  );
}

function ListBlock({
  title,
  items,
  fallback,
  tone = "alpine",
}: {
  title: string;
  items: string[];
  fallback: string;
  tone?: "alpine" | "plain";
}) {
  return (
    <section className={`rounded-3xl border p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] ${tone === "alpine" ? "border-alpine/30 bg-alpine-soft" : "border-line bg-paper"}`}>
      <h3 className="font-display text-3xl font-bold text-ink">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-5 list-disc space-y-3 pl-6 text-lg text-ink">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-lg whitespace-pre-line text-ink">{fallback}</p>
      )}
    </section>
  );
}
