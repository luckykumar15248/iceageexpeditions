import type { Metadata } from "next";
import Link from "next/link";
import { CatalogFilters } from "@/components/marketing/catalog-filters";
import { EnquiryForm } from "@/components/marketing/enquiry-form";
import { ExpeditionCardView } from "@/components/marketing/expedition-card";
import { OfflineNote } from "@/components/marketing/offline-note";
import { getCatalog, parseCatalogFilters } from "@/lib/catalog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Expeditions",
  description: "Published Himalayan 4x4 SUV and motorbike expeditions, filtered by vehicle, region, and season.",
  alternates: { canonical: "/expeditions" },
};

export default async function ExpeditionsPage({ searchParams }: PageProps<"/expeditions">) {
  const params = await searchParams;
  const filters = parseCatalogFilters({
    vehicle: typeof params.vehicle === "string" ? params.vehicle : undefined,
    region: typeof params.region === "string" ? params.region : undefined,
    season: typeof params.season === "string" ? params.season : undefined,
    difficulty: typeof params.difficulty === "string" ? params.difficulty : undefined,
  });
  const catalog = await getCatalog(filters);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold tracking-wide text-alpine uppercase">The route book</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Expeditions</h1>
      <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
        Filter by vehicle, difficulty, region, and season. Open and limited-slot badges use the seats still left on the
        next departure. A sold-out batch stays on the card and cannot be requested.
      </p>
      <div className="mt-12 grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <aside aria-label="Filter expeditions">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Filter trips</h2>
          <CatalogFilters filters={filters} regions={catalog.regions} seasons={catalog.seasons} />
        </aside>
        {catalog.status === "offline" ? (
          <OfflineNote />
        ) : catalog.expeditions.length === 0 ? (
          <div className="grid gap-8">
            <p className="text-base leading-relaxed text-muted">
              Nothing published matches these filters.{" "}
              <Link href="/expeditions" className="font-medium text-alpine-deep underline">
                Clear filters
              </Link>
              .
            </p>
            <EnquiryForm heading="Ask about a season" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalog.expeditions.map((expedition) => (
              <ExpeditionCardView key={expedition.slug} expedition={expedition} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
