import Link from "next/link"

const expeditions = [
  { href: "/expeditions?vehicle=SUV_4X4", label: "4x4 SUV expeditions" },
  { href: "/expeditions?vehicle=MOTORBIKE", label: "Motorbike trails" },
  { href: "/enquire?interest=winter-spiti", label: "Winter Spiti" },
  { href: "/enquire?interest=zanskar-chadar", label: "Zanskar Valley" },
  { href: "/enquire?interest=manali-leh", label: "Ladakh loop" },
] as const

const explore = [
  { href: "/about", label: "About us" },
  { href: "/safety", label: "Safety and altitude guide" },
  { href: "/gear", label: "Gear and packing checklists" },
  { href: "/faq", label: "FAQ" },
] as const

const trust = [
  { href: "/terms", label: "Terms and conditions" },
  { href: "/booking-policies", label: "Booking policies" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/safety#permits", label: "Permit guidelines" },
] as const

const social = [
  { href: "/contact", label: "Ask the desk for Instagram", icon: "instagram" },
  { href: "/contact", label: "Ask the desk for YouTube", icon: "youtube" },
  { href: "/contact", label: "Ask the desk for Facebook", icon: "facebook" },
  { href: "/contact", label: "Ask the desk for X", icon: "x" },
] as const

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="h-1 w-12 bg-alpine" aria-hidden="true" />
            <p className="mt-5 font-display text-3xl font-bold leading-tight text-ink">
              Ice Age Expeditions
              <span className="mt-1 block text-xl font-semibold text-alpine">The Era of Trails</span>
            </p>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
              Guided Himalayan 4x4 convoys and custom motorbike expeditions, with support in the line and a date only
              when ops publishes one.
            </p>
            <p className="mt-6 text-lg font-semibold text-ink">Base camp</p>
            <p className="mt-2 max-w-md text-lg leading-relaxed text-muted">
              Kullu / Bhuntar, Himachal Pradesh, India. The valley desk for briefings and vehicle handover. Not a street
              address you can navigate to without ops.
            </p>
          </div>

          <nav aria-label="Expeditions" className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-ink">Expeditions</h2>
            <ul className="mt-4 space-y-1">
              {expeditions.map((link) => (
                <li key={link.href}>
                  <Link className="inline-flex min-h-11 items-center text-lg text-ink hover:text-alpine-deep" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Explore" className="lg:col-span-3">
            <h2 className="font-display text-2xl font-bold text-ink">Explore</h2>
            <ul className="mt-4 space-y-1">
              {explore.map((link) => (
                <li key={link.href}>
                  <Link className="inline-flex min-h-11 items-center text-lg text-ink hover:text-alpine-deep" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h2 className="mt-8 font-display text-2xl font-bold text-ink">Trust</h2>
            <ul className="mt-4 space-y-1">
              {trust.map((link) => (
                <li key={link.href}>
                  <Link className="inline-flex min-h-11 items-center text-lg text-ink hover:text-alpine-deep" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="font-display text-2xl font-bold text-ink">Contact</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Phone, WhatsApp, and email are sent with your departure. They are not listed on this site.
            </p>
            <p className="mt-4">
              <Link className="text-lg font-semibold text-alpine-deep hover:underline" href="/contact">
                Write to the desk
              </Link>
            </p>
            <p className="mt-2">
              <Link className="text-lg font-semibold text-alpine-deep hover:underline" href="/enquire">
                Request a quote
              </Link>
            </p>
            <h3 className="mt-8 font-display text-2xl font-bold text-ink">On the road</h3>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              The emergency number is the one ops gives you before you leave Bhuntar. This page is not a rescue line,
              and it does not replace local emergency services.
            </p>
          </div>
        </div>

        <section
          aria-labelledby="trail-dispatch-heading"
          className="mt-14 rounded-3xl border border-line bg-canvas px-6 py-8 sm:px-10"
        >
          <h2 id="trail-dispatch-heading" className="font-display text-3xl font-bold text-ink">
            Expedition dispatches
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">
            Subscribe to expedition dispatches and seasonal opening alerts. This opens an enquiry for the desk. It does
            not add you to a mailing list.
          </p>
          <form action="/enquire" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="interest" value="dispatches" />
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-base font-semibold text-ink" htmlFor="trail-dispatch-email">
              Email
              <input
                id="trail-dispatch-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="min-h-14 rounded-md border border-line bg-paper px-4 text-lg font-normal text-ink"
              />
            </label>
            <button
              type="submit"
              className="min-h-14 rounded-md bg-alpine px-7 text-lg font-semibold text-white hover:bg-alpine-deep"
            >
              Subscribe
            </button>
          </form>
        </section>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <ul className="flex gap-3" aria-label="Social profiles">
              {social.map((item) => (
                <li key={item.icon}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className="inline-flex size-12 items-center justify-center rounded-full border border-line text-ink hover:border-alpine hover:text-alpine"
                  >
                    <SocialIcon name={item.icon} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Instagram, YouTube, Facebook, and X are confirmed by the desk. They are not published as guessed profile
              links.
            </p>
          </div>
          <p className="text-lg text-ink lg:max-w-sm lg:text-right">
            © 2026 Ice Age Expeditions. All rights reserved. Built for the high Himalayas.
          </p>
        </div>
      </div>
    </footer>
  )
}

function SocialIcon({ name }: { name: (typeof social)[number]["icon"] }) {
  const common = { viewBox: "0 0 24 24", className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true } as const
  if (name === "instagram") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === "youtube") {
    return (
      <svg {...common}>
        <rect x="3" y="6.5" width="18" height="11" rx="3" />
        <path d="M11 10.2v3.6l3.2-1.8z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === "facebook") {
    return (
      <svg {...common}>
        <path d="M14 8h2V5h-2c-2.2 0-3.5 1.4-3.5 3.6V11H8v3h2.5v5H14v-5h2.2l.4-3H14V8.8c0-.5.2-.8.8-.8z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  )
}
