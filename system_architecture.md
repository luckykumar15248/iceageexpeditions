# System architecture — Ice Age Expeditions

**Product:** The Era of Trails  
**Date:** 27 September 2026  
**Status:** Marketing site and domain layer in progress. Ops auth and payments are still ahead.

## 1. Purpose

Ice Age Expeditions needs a web system that publishes Himalayan 4x4 SUV and motorbike expeditions, sells seats or bike slots on dated departures, and lets staff change inventory when weather, permits, or fitness require it.

Public pages live in `app/(marketing)` and read published expeditions through `lib/catalog.ts`. The domain layer is `prisma/schema.prisma`, the init migration, and `lib/` booking services. Staff login and payment capture are still unimplemented; role checks assume a trusted `staffId` until Phase 5 auth exists.

## 2. Architecture principles

- One deployable Next.js application. Marketing, booking, and ops share a process and a database, separated by route groups and authorization.
- Server Components render public data. Mutations run in Server Actions or Route Handlers.
- MySQL is the source of truth for inventory and bookings. `lib/inventory.ts` reserves units with a conditional `updateMany` inside a serializable transaction. The browser is never authoritative for price or remaining capacity.
- Prisma 7 is the only application query API. Generated client output is `app/generated/prisma`.
- Read Next.js 16 docs in `node_modules/next/dist/docs/` before using framework APIs that may have changed.
- Fail closed: missing auth, missing price, or missing capacity means the departure is not bookable.

## 3. System context

```text
Guest browser
    │  HTTPS
    ▼
Next.js 16 (App Router, React 19)
    ├── (marketing)  Server Components, cached reads
    ├── (booking)    Server Actions, uncached writes
    └── (ops)        Staff session required
            │
            ▼
        Prisma 7 client
            │
            ▼
          MySQL
            ▲
            │ webhooks (later)
     Payment provider
```

External systems, all planned rather than installed:

| System | Role | When |
| --- | --- | --- |
| MySQL | Expeditions, departures, bookings, enquiries | Phase 2 |
| Payment provider | INR deposit and balance, signed webhooks | Phase 7 |
| Transactional email or SMS | Guest and ops notifications | Phase 7 |
| Object storage / `public` or remote images | Route photography | Phase 1–2 |
| Staff identity provider | Ops login | Phase 5 |

## 4. Application layout (target)

```text
app/
  layout.tsx                 Brand shell, metadata template
  globals.css                Tailwind v4 tokens
  (marketing)/
    page.tsx                 Homepage
    expeditions/page.tsx
    expeditions/[slug]/page.tsx
    safety/page.tsx
    gear/page.tsx
    faq/page.tsx
    about/page.tsx
  (booking)/
    booking/[departureId]/page.tsx
  (ops)/
    ops/...                  Authenticated
  sitemap.ts
  robots.ts
  api/webhooks/payments/route.ts
components/                  Header, itinerary, departure table, forms
lib/
  db.ts                      Prisma singleton and serializable transactions
  inventory.ts               Conditional reserve and release
  bookings.ts                Create and cancel without oversell
  departures.ts              Ops status changes and manifests
  enquiries.ts               General, waitlist, and private-group requests
  staff.ts                   Role checks
  audit.ts                   Ops audit rows
  pricing.ts                 Paise quotes
prisma/schema.prisma
prisma.config.ts             CLI datasource URL
prisma7.config.ts            Re-exports prisma.config.ts
```

Path alias `@/*` points at the repo root.

## 5. Domain model

```text
Expedition 1 ──── * ItineraryDay
     │
     └──── * Departure 1 ──── * Booking 1 ──── * Traveler
                │
                └──── * Enquiry (optional link by slug or departure)
```

### Expedition

Stable description of a route: slug, title, region, vehicle class, duration days, max altitude meters, difficulty, season label, summary, inclusions, exclusions, hero image, publish status.

Vehicle class is an enum: `SUV_4X4`, `MOTORBIKE`. UI, capacity wording, and required traveler fields branch on it.

### ItineraryDay

`dayNumber`, title, narrative, sleep stop, sleep altitude meters, moving hours. Unique on `(expeditionId, dayNumber)`.

### Departure

A sellable date: `startDate`, `endDate`, `meetingPoint`, `capacity`, `seatsRemaining`, `pricePaisa`, `depositPaisa`, `status`, cancellation policy id or snapshot. Index `(expeditionId, startDate)` and `(status, startDate)`.

`seatsRemaining` means SUV seats or motorbike rider slots according to the parent expedition. The name in the database can stay generic; the UI must not.

### Booking and Traveler

Booking: departure id, reference, status, party size, `unitsHeld`, amount due paise, deposit due paise, amount paid paise, policy snapshot, optional cancelling staff id.  
Traveler: name, phone, email, emergency contact, experience band, `isPillion`.  
`MedicalDeclaration` is a separate row keyed by traveler. Public booking selects omit it.

Statuses: `REQUESTED`, `PENDING_PAYMENT`, `DEPOSIT_PAID`, `PAID`, `CANCELLED`, `REFUNDED`. Holding statuses keep `unitsHeld`. Cancel sets `unitsHeld` to 0 and then releases seats only if the departure is still `OPEN` or `FULL`.

### Staff, audit, and enquiries

`StaffUser.role`: `OPS_ADMIN`, `EXPEDITION_LEAD`, `GUIDE`, `FINANCE`, `VIEWER`.  
`AuditLog` stores actor, action, entity, reason, and before/after JSON for booking create, booking cancel, departure status changes, and enquiries.  
`Enquiry.kind`: `GENERAL`, `WAITLIST` (full, closed, or cancelled departures), `CUSTOM_PRIVATE` (vehicle class required).

### Enquiry

Used when nothing is open: contact, preferred month, vehicle class, party size, message, created time.

## 6. Key flows

### Read an expedition

1. Request `/expeditions/[slug]`.
2. Server Component loads the published expedition, ordered days, and departures.
3. Draft or missing slug calls `notFound()`.
4. Page sets metadata from the expedition fields.
5. Client islands handle the gallery and mobile filter only.

### Create a booking

1. Guest submits party size and traveler details.
2. Server Action validates input.
3. Inside `runSerializable`: load the published departure; reject unless status is `OPEN` and the start date is after today in Asia/Kolkata; `reserveUnits` decrements only when `seatsRemaining >= party`; insert booking, travelers, and medical rows; write an audit row that omits medical text. If the decrement matches zero rows, the transaction rolls back.
4. Return the booking id and the server-computed deposit.
5. UI confirms the request. It does not claim a captured payment until a webhook or ops confirmation says so.

### Close for weather

1. Authenticated ops user sets status `CANCELLED` or `CLOSED` with a reason.
2. Public queries that filter `OPEN` drop the departure.
3. Existing bookings stay for refund handling. Rows are not deleted.

### Payment webhook (later)

1. Route Handler reads the raw body and verifies the provider signature.
2. Idempotency key on the provider event id prevents double application.
3. Booking transitions to `DEPOSIT_PAID` or `PAID` only after verification.

## 7. Caching

- Cache published expedition pages and the catalog index.
- Revalidate those tags when ops publishes an expedition or changes a departure.
- Do not cache booking actions, ops manifests, or personalized confirmations.
- Sitemap generation reads published slugs only.

## 8. Security boundaries

- `DATABASE_URL` and provider secrets are server-only.
- Public serializers whitelist fields. Medical notes, government ids, and payment secrets are not on that list.
- Ops layout checks the session before children render.
- Every booking read by id also checks the guest token or the staff role. Knowing a cuid is not authorization.
- Enquiry and booking endpoints are rate-limited.

## 9. Frontend architecture

- Tailwind v4 via `@import "tailwindcss"` and `@theme inline`. Tokens carry the rugged palette so pages do not hard-code random zinc utilities for brand surfaces.
- `next/font` for display and body. `next/image` for route photography.
- `(marketing)`, `(booking)`, and `(ops)` keep three different headers. Ops is not linked from the public footer.

## 10. Data and deploy topology

| Environment | App | Database | Migrations |
| --- | --- | --- | --- |
| Local | `npm run dev` | MySQL from `.env` | `prisma migrate dev` |
| Production | `npm run build` / `npm start` (or the host’s Next adapter) | Managed MySQL | `prisma migrate deploy` |

Generate the Prisma client in the build step before `next build`. Do not point local migrate commands at the production URL.

## 11. Observability

Log booking and departure ids, status transitions, and error codes (`DEPARTURE_FULL`, `DEPARTURE_CLOSED`). Omit traveler medical text, full phone numbers, and webhook secrets. A future error reporter can attach to server action failures without changing the domain model.

## 12. Architecture decisions

| ID | Decision | Why |
| --- | --- | --- |
| ADR-1 | Modular monolith on Next.js | One team, one booking database, shared UI |
| ADR-2 | MySQL + Prisma 7 | Already selected in `schema.prisma` and `package.json` |
| ADR-3 | Integer paise | Avoid binary float errors on deposits |
| ADR-4 | Capacity in the same transaction as the booking insert | Prevent oversell of small Himalayan groups |
| ADR-5 | Payments deferred | Inventory honesty ships before a provider is chosen |
| ADR-6 | Vehicle class is an enum, not a tag | SUV and motorbike flows differ in liability and capacity |

## 13. What not to build yet

A separate inventory microservice, a GraphQL gateway, or a client-side global store for catalog data would split a transaction that needs to stay in MySQL. Add them only if a measured bottleneck appears after launch.
