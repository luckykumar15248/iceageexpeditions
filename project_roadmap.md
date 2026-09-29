# Project roadmap — Ice Age Expeditions

**Product:** The Era of Trails, Himalayan 4x4 SUV and motorbike expeditions  
**Date:** 27 September 2026  
**Baseline:** Next.js 16 App Router starter, Tailwind CSS 4, Prisma 7 pointed at MySQL, no domain models, no expedition UI

This roadmap turns the scaffold into a booking platform. Phases are sequential where a later phase depends on data from an earlier one. Visual polish can proceed in parallel with the catalog read path.

## Current baseline

| Area | State |
| --- | --- |
| App shell | `app/layout.tsx` and `app/page.tsx` still use create-next-app copy and Geist |
| Styling | Tailwind v4 tokens in `app/globals.css` are the default zinc pair |
| Data | Domain schema, init migration, and `lib/` booking transactions exist. Apply the migration to MySQL before using them. Auth and payments are not installed |
| Auth, payments, email | Not installed |
| SEO | No sitemap, robots, or expedition metadata |
| Rules | `.cursorrules` and `.cursor/rules/*.mdc` |

## Phase 0 — Foundation (now)

**Outcome:** Agents and developers share one product language and a safe local stack.

- Keep Next.js, TypeScript, Tailwind 4, Prisma 7, and MySQL as the stack.
- Confirm local MySQL and `DATABASE_URL`. Generate the Prisma client into `app/generated/prisma`.
- Leave payments and public ops disabled until their phases.

**Exit:** `npm run lint` and `npm run build` pass on the scaffold. `.env` is gitignored.

## Phase 1 — Brand shell and design system

**Outcome:** The public site looks and reads like Ice Age Expeditions.

- Replace default metadata, fonts, and homepage with the Era of Trails narrative.
- Add color and type tokens (ink, snow, glacier, ochre) in `@theme`.
- Ship shared header, footer, and a mobile primary action pattern.
- Add static pages: about, safety, gear, FAQ. Safety must cover altitude, permits, weather, and support vehicles without inventing regulations.

**Exit:** Homepage and static pages have no “Create Next App” strings. Text on photography meets AA contrast. Layout works at 390px and desktop widths.

## Phase 2 — Catalog

**Outcome:** Ops can publish a route and guests can read it.

- Prisma models: `Expedition`, `ItineraryDay`, publish status, vehicle class.
- Seed two real corridors the business actually runs (confirm names with ops before seeding marketing claims). Suggested first shapes: a motorbike high-route expedition and a 4x4 SUV expedition.
- Public routes: `/expeditions`, `/expeditions/[slug]`.
- Itinerary timeline, inclusions, exclusions, altitude, duration, difficulty.
- Empty and not-found states.

**Exit:** A published slug renders days in order. A draft slug 404s and is omitted from any sitemap.

## Phase 3 — Departures and enquiries

**Outcome:** Dates and demand exist before money does.

- `Departure` with capacity, remaining units, price and deposit in paise, status, meeting point.
- Public departure list. Full and closed rows are visible and not selectable.
- Enquiry form stored in MySQL and acknowledged on screen.
- Separate SUV seat counts from motorbike rider slots.

**Exit:** Filtering by vehicle class works. An enquiry for a closed season is stored once and does not create a booking.

## Phase 4 — Booking requests

**Outcome:** A guest can hold a place without overselling.

- `Booking` and `Traveler`, emergency contact, experience, pillion flag, policy acknowledgment.
- Transaction that checks and decrements remaining capacity.
- Server-calculated INR display from paise.
- Validation errors inline. Concurrent double-submit test for the last seat.

**Exit:** Capacity cannot go negative. Draft and full departures reject booking actions with a stable error code.

## Phase 5 — Ops console

**Outcome:** Staff run the season without database access.

- Authenticated `/ops` for expeditions, departures, enquiries, and manifests.
- Status changes with actor, timestamp, and reason.
- Medical fields excluded from every public serializer.

**Exit:** An anonymous request to `/ops` does not receive manifest data. Closing a departure flips the public page on the next load.

## Phase 6 — SEO and content launch

**Outcome:** Routes can be discovered from search.

- Title template, canonical URLs, Open Graph images, `sitemap.ts`, `robots.ts`.
- JSON-LD for `TouristTrip`, `Organization`, `BreadcrumbList`, and `FAQPage` where the FAQ is visible.
- Unique copy per expedition. See `seo-audit-report.md`.

**Exit:** Sitemap lists only published URLs. Rich-result fields match visible text.

## Phase 7 — Payments and notifications

**Outcome:** Deposits are captured by a real provider, not recorded as a hope.

- Choose an INR-capable provider and verify webhooks by signature.
- States: requested, deposit paid, balance due, paid, refunded, cancelled.
- Email or SMS for enquiry received, booking requested, and departure cancelled. Templates must not include medical notes.

**Exit:** A forged webhook cannot mark a booking paid. Refunds write an audit row.

## Phase 8 — Hardening and launch

- Load test the capacity transaction.
- Accessibility pass on booking and itinerary.
- Backup and restore drill for MySQL.
- Production `migrate deploy`, environment secrets, and a rollback note.

**Exit:** Launch checklist in `devops-seo` rule is complete for the first season’s routes.

## Dependencies

```text
Phase 0 → Phase 1 (shell) ─┐
Phase 0 → Phase 2 (catalog) ┴→ Phase 3 → Phase 4 → Phase 5
Phase 2 → Phase 6 (SEO can start as soon as slugs exist)
Phase 4 → Phase 7 (payments need a booking row)
Phase 5 + 6 + 7 → Phase 8
```

## Sequencing note

Do not build the payment form before capacity transactions exist. A beautiful checkout that oversells a 12-bike departure is a failed season. Do not publish ops routes “temporarily” without auth.

## Suggested first release

Release A is Phase 1–3: brand, two expeditions, departures, enquiries.  
Release B adds Phase 4–5: booking requests and ops.  
Release C adds Phase 6–8: search, payments, and production launch.

## Owners

| Concern | Guidance |
| --- | --- |
| Scope and acceptance | `project-manager` rule and this roadmap |
| Schema and migrations | `db-architect` rule |
| Server mutations | `backend-architect` rule |
| Pages and routing | `frontend-architect` rule |
| Look and tone | `ui-ux-designer` rule |
| Traveler data | `security-auditor` rule |
| Proof | `qa-tester` rule |
| Hosting and indexability | `devops-seo` rule |
