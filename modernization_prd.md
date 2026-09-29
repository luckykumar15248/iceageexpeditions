# Modernization PRD — Ice Age Expeditions

**Product:** Ice Age Expeditions, The Era of Trails  
**Document status:** Baseline PRD for the greenfield booking platform  
**Date:** 27 September 2026  
**Codebase:** Next.js 16.3.6 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 7, MySQL

**Domain status:** `prisma/schema.prisma` and `lib/bookings.ts` now cover expeditions, dated departures, transactional inventory, travelers, medical declarations, enquiries, staff roles, and audit logs. The marketing UI, staff login, and payment capture are still ahead on the roadmap.

## 1. Problem

Ice Age Expeditions runs guided Himalayan journeys by 4x4 SUV and motorbike. The repository is still the create-next-app starter: a single `app/page.tsx`, default “Create Next App” metadata, Geist fonts, and a Prisma schema with no domain models.

Travelers comparing Ladakh, Spiti, Zanskar, and similar high routes cannot see a real itinerary, a dated departure, or a trustworthy price. Ops cannot record capacity, deposits, or a manifest. Modernization means replacing the scaffold with a booking product that tells the truth about altitude, season, vehicle class, and seat or bike availability.

## 2. Goals

1. Publish a rugged, mobile-first marketing and catalog site for SUV and motorbike expeditions.
2. Represent each journey as an expedition plus one or more dated departures with capacity and price.
3. Let a guest enquire and, when a departure is open, start a booking that cannot oversell.
4. Give ops a private way to open, close, and reschedule departures and to read a manifest.
5. Make expedition URLs indexable with unique titles, a sitemap, and structured data that matches the page.

## 3. Non-goals (this program)

- Live GPS tracking, satellite messaging, or a multi-operator marketplace.
- Guest-authored public routes.
- Cryptocurrency payments.
- Rewriting the stack away from Next.js, Prisma, or MySQL.

## 4. Personas

| Persona | Need | Success looks like |
| --- | --- | --- |
| Self-ride motorcyclist | Compare season, distance, altitude, and support before committing a bike and a pillion | A route page states riding days, max altitude, support vehicle, and open departures |
| SUV guest or private group | Book seats with a clear meeting point and what is included | Party size cannot exceed seats remaining; inclusions and exclusions are on the page |
| Expedition ops | Control inventory when passes close or a rider fails the fitness screen | Closing a departure removes it from sale immediately and keeps the audit reason |
| First-time searcher | Land from a query such as “Manali Leh motorbike expedition” | The page title, H1, and itinerary match that route |

## 5. User journeys

### 5.1 Discover

Guest opens the homepage or `/expeditions`, filters by vehicle class and season, and opens a slug. The page shows summary, max altitude, duration, difficulty, day-by-day itinerary, gear, inclusions, exclusions, and departures.

### 5.2 Enquire

If no departure is open, the guest submits an enquiry: name, contact, preferred month, vehicle class, party size, and a note. Ops receives the lead. The guest sees confirmation, not a fake booking number.

### 5.3 Book

Guest selects an open departure, enters party size (SUV seats or motorbike riders plus optional pillion), experience level, emergency contact, and acknowledges cancellation terms. The server recomputes deposit and balance in paise, checks capacity inside a transaction, and creates a booking in `PENDING_PAYMENT` or `REQUESTED` according to the payment phase in force.

### 5.4 Ops override

Staff authenticates, opens the manifest, and may mark a departure full, cancelled for weather, or completed. Medical self-declarations stay off public responses.

## 6. Functional requirements

### Catalog

- FR-1. Expeditions have slug, title, region, vehicle class (`SUV_4X4` or `MOTORBIKE`), duration, max altitude in meters, difficulty, season text, summary, and publish status.
- FR-2. Itinerary days are ordered, with sleep altitude and ride or drive hours.
- FR-3. Draft expeditions are unreachable on public URLs and absent from the sitemap.
- FR-4. A season with zero open departures renders an empty state and an enquiry path.

### Departures and money

- FR-5. Each departure has start and end dates, meeting point, capacity, remaining units, price and deposit in integer paise, currency INR, and status (`DRAFT`, `OPEN`, `FULL`, `CLOSED`, `CANCELLED`, `COMPLETED`).
- FR-6. SUV capacity counts seats. Motorbike capacity counts rider slots. Pillion does not consume a second bike slot unless ops configures it that way.
- FR-7. Booking creation and capacity decrement commit in one database transaction.
- FR-8. Clients cannot submit the amount to charge. The server calculates it.
- FR-9. Cancellation terms are stored per departure or expedition policy and shown before confirm.

### Travelers

- FR-10. A booking stores a lead guest plus travelers: name, contact, emergency contact, experience band, and pillion flag for bikes.
- FR-11. Medical self-declaration is collected and visible only to authorized ops.
- FR-12. Copy names acclimatization, permit classes (Inner Line Permit and Protected Area Permit where the route requires them), and road-closure risk. The product must not invent permit law.

### Ops

- FR-13. Staff can create and publish expeditions, add itinerary days, and open departures.
- FR-14. Staff can view a departure manifest without exposing it publicly.
- FR-15. Status changes record actor, time, and reason.

### Platform

- FR-16. Root metadata identifies Ice Age Expeditions, The Era of Trails.
- FR-17. Public pages meet the rugged visual system in `.cursor/rules/ui-ux-designer.mdc`.
- FR-18. Forms preserve input and show field-level errors.

## 7. Non-functional requirements

- NFR-1. TypeScript strict. No `any` on domain boundaries.
- NFR-2. Server-side authorization for every ops read and mutation.
- NFR-3. WCAG AA contrast for text, including text on photography.
- NFR-4. Usable booking path at 390px width.
- NFR-5. Published catalog reads may be cached; booking mutations are never cached.
- NFR-6. Secrets stay in environment variables. Medical and payment data stay out of logs and analytics.

## 8. Content principles

Write like a trail briefing. Name the pass, the altitude, the night’s stop, and the support vehicle. Do not promise that a high pass will be open. Do not use stock luxury-travel language. Distinguish a supported motorbike expedition from a self-drive SUV journey in both layout and words.

## 9. Success metrics

- A guest can complete discovery-to-booking-request on a phone without ops intervention when a departure is open.
- Zero oversells in concurrency tests for a departure of known capacity.
- Every indexable expedition URL has a unique title, description, canonical, and `TouristTrip` JSON-LD consistent with the visible itinerary.
- Ops can close a departure and see it leave the public bookable set on the next request.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Overselling a small departure | Transactional capacity check; seats remaining constrained to zero or above |
| Incorrect permit or medical advice | Editable content reviewed by ops; product does not hard-code legal claims |
| Altitude and weather liability | Prominent safety page; booking cannot confirm without acknowledgment |
| Starter template shipped by mistake | Launch checklist blocks default metadata, missing sitemap, and draft routes |
| Prisma 7 / Next 16 API drift | Agents read `node_modules/next/dist/docs/` and the repo Prisma skills before those changes |

## 11. Open decisions

- Payment capture vendor (for example Razorpay for INR cards and UPI) is not selected. Until it is, bookings stop at request or manual deposit confirmation.
- Auth vendor for ops is not selected. Until it is, ops routes stay unimplemented rather than public.
- Exact launch routes (which seasons and corridors go live first) are an ops content decision, not a schema decision.
