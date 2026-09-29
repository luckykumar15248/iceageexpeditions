# SEO audit report — Ice Age Expeditions

**Site:** Ice Age Expeditions (The Era of Trails)  
**Audit date:** 27 September 2026  
**Scope:** Repository baseline at the Next.js 16 starter. No production hostname was crawled. Findings describe the code that would ship if the app were deployed today, plus the remediation program for a Himalayan 4x4 and motorbike expedition brand.

## 1. Executive summary

The site is not index-ready. `app/layout.tsx` sets the title to “Create Next App” and a generator description. There is no `metadataBase`, canonical strategy, sitemap, robots file, Open Graph image, or JSON-LD. The only page is the starter homepage. Fonts are Geist, which does not support the expedition brand.

Search demand for this business is route-shaped: people look for a corridor, a vehicle, and a season (“Leh motorbike expedition”, “Spiti 4x4 tour”, “Manali Leh road trip with support”). The information architecture should give each published expedition its own URL with unique copy. Until Phase 2 of `project_roadmap.md` creates those URLs, technical SEO work should prepare the shell and avoid indexing the scaffold.

**Overall:** Critical gaps on indexability and brand identity. No content quality score is possible yet because expedition content does not exist.

## 2. Method

- Reviewed `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next.config.ts`, and `package.json`.
- Confirmed there is no `app/sitemap.ts`, `app/robots.ts`, `opengraph-image`, or JSON-LD.
- Compared the gap to the target in `system_architecture.md` and the SEO rules in `.cursor/rules/devops-seo.mdc`.

This is a code audit, not a Search Console, backlink, or Core Web Vitals field study. Re-run those after the first real routes are on a public hostname.

## 3. Findings

| ID | Severity | Finding | Evidence | Remediation |
| --- | --- | --- | --- | --- |
| SEO-01 | Critical | Default document title and description | `metadata.title` is “Create Next App” in `app/layout.tsx` | Title template `%s · Ice Age Expeditions`. Homepage title names 4x4 and motorbike Himalayan expeditions |
| SEO-02 | Critical | No canonical host | `metadataBase` unset; `next.config.ts` empty | Set `metadataBase` from the production origin environment variable |
| SEO-03 | Critical | No sitemap or robots | Neither file exists | Add `app/sitemap.ts` and `app/robots.ts`. Disallow `/ops` and payment callbacks |
| SEO-04 | High | Single non-brand homepage | `app/page.tsx` is the starter | Replace with a crawlable homepage: vehicle classes, featured routes, safety link |
| SEO-05 | High | No expedition URLs | No `app/expeditions` | One indexable URL per published expedition: `/expeditions/[slug]` |
| SEO-06 | High | No structured data | No JSON-LD | `Organization` sitewide; `TouristTrip` on expeditions; `BreadcrumbList`; `FAQPage` only where FAQs are visible |
| SEO-07 | High | No social image | No Open Graph image | 1200×630 route image per expedition plus a default brand image |
| SEO-08 | Medium | Heading and copy are boilerplate | Starter H1 tells developers to edit `page.tsx` | One descriptive H1. First paragraph states who the trip is for and where it goes |
| SEO-09 | Medium | Image SEO absent | Starter SVGs only | `next/image` with descriptive alt text (pass, vehicle, action) |
| SEO-10 | Medium | No internal links | No nav | Header links: expeditions, SUV, motorbike, safety, gear, FAQ, about |
| SEO-11 | Low | Language is correct | `<html lang="en">` | Keep `en`. Add another locale only if ops publishes translated copy |
| SEO-12 | Low | Performance not yet measurable | Starter page is tiny | After photography ships, priority-load only the hero; lazy-load galleries |

## 4. Information architecture

Recommended public URLs:

| URL | Intent |
| --- | --- |
| `/` | Brand and route entry |
| `/expeditions` | All published journeys |
| `/expeditions?vehicle=motorbike` | Self-ride and supported bike expeditions |
| `/expeditions?vehicle=suv` | 4x4 journeys |
| `/expeditions/[slug]` | A specific route and its departures |
| `/safety` | Altitude, permits, weather, support |
| `/gear` | Bike and SUV packing lists |
| `/faq` | Dates, deposits, fitness, cancellations |
| `/about` | Ice Age Expeditions, The Era of Trails |

Do not create doorway pages that repeat the same itinerary under five keyword URLs. One expedition, one canonical slug. Season and departure dates stay on that page.

`/ops` and any booking callback must be `noindex` and omitted from the sitemap even if a session wall is added later.

## 5. Keyword map (editorial, not stuffed)

Use these themes in titles and visible headings only when the expedition actually matches. Do not publish a page for a corridor the company does not run.

| Theme | Example title pattern | Primary page |
| --- | --- | --- |
| Brand | Ice Age Expeditions · Himalayan 4x4 & motorbike expeditions | `/` |
| Motorbike corridor | `{Route} motorbike expedition · {duration} days` | `/expeditions/[slug]` |
| SUV corridor | `{Route} 4x4 SUV expedition · {duration} days` | `/expeditions/[slug]` |
| Trust | High-altitude safety, permits, and support vehicles | `/safety` |
| Practical | What to pack for a Ladakh or Spiti expedition | `/gear` |

Title rules:

- Under about 60 characters where the route name allows.
- Include vehicle class and duration on expedition titles.
- Unique meta description (about 150–160 characters) with meeting region, support vehicle, and season. No “guaranteed open roads.”

## 6. On-page template for an expedition

1. H1: expedition name and region.
2. Summary: days, max altitude, vehicle class, season, support.
3. Departure table: the commercial block, also useful to visitors.
4. Day-by-day itinerary in order, with sleep altitude.
5. Inclusions and exclusions.
6. Fitness, acclimatization, and permit notes that match ops-approved copy.
7. FAQ only for questions answered on the page.
8. Internal links to safety, gear, and the other vehicle class.

`TouristTrip` JSON-LD should repeat the visible name, description, and itinerary stops. If a field is unknown, omit it. Do not invent `aggregateRating`.

## 7. Technical checklist (to clear before indexing)

- [ ] Remove “Create Next App” from titles, descriptions, and body copy.
- [ ] Set `metadataBase` and a title template in the root layout.
- [ ] `generateMetadata` on each expedition from database fields.
- [ ] Canonical URL equals the slug URL.
- [ ] `app/sitemap.ts` lists home, guides, and published expeditions only.
- [ ] `app/robots.ts` allows `/` and disallows `/ops`.
- [ ] Open Graph and Twitter card fields on home and expeditions.
- [ ] JSON-LD validates and matches visible content.
- [ ] HTML `lang="en"`.
- [ ] Images have width, height, and alt. Hero uses `priority`.
- [ ] Mobile layout keeps the H1 and primary action without a blocked render.
- [ ] 404 for unknown and draft slugs.
- [ ] XML sitemap and robots reachable on the production host.
- [ ] Submit the sitemap in Search Console after launch (manual ops step).

## 8. Content risks

- **Thin pages.** A card with a price and no itinerary should stay `noindex` until the day-by-day copy exists.
- **Duplicate corridors.** If two products share a route, differentiate by vehicle class in the slug, H1, and canonical (`...-motorbike`, `...-4x4`).
- **False scarcity or false safety.** “Always open in July” is a trust and liability problem, not an SEO win.
- **Boilerplate alt text.** “IMG_2043” and “hero” waste image search. Name the place and the vehicle.

## 9. Measurement after launch

Track, per expedition URL:

- Impressions and clicks for route + vehicle queries.
- Index coverage of published slugs versus drafts accidentally included.
- Enquiry and booking starts from organic landing pages.
- Core Web Vitals on the expedition template once real photography is in place.

Review this report again when Phase 6 in `project_roadmap.md` is complete. Replace Section 3 with field data from the live host.

## 10. Priority order

1. Stop the scaffold from being the public identity (SEO-01, SEO-04, SEO-08).
2. Publish real expedition URLs (SEO-05, SEO-06).
3. Add sitemap, robots, canonicals, and social images (SEO-02, SEO-03, SEO-07).
4. Measure on the production hostname and adjust copy to the routes ops actually sells.
