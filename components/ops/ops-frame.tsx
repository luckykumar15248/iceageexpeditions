import Link from "next/link"
import { headers } from "next/headers"
import { signOutOps } from "@/app/(ops)/ops/actions"
import { staffRoleLabel } from "@/lib/staff"
import type { OpsStaff } from "@/lib/ops-auth"

const links = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/expeditions", label: "Expeditions" },
  { href: "/ops/departures", label: "Departures" },
  { href: "/ops/manifests", label: "Passenger manifests" },
  { href: "/ops/enquiries", label: "Enquiries" },
  { href: "/ops/hero-slides", label: "Hero slides" },
  { href: "/ops/galleries", label: "Gallery" },
  { href: "/ops/media", label: "Media library" },
] as const

export async function OpsFrame({ staff, children }: { staff: OpsStaff; children: React.ReactNode }) {
  const path = (await headers()).get("x-ops-path") ?? ""
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="border-b border-line bg-paper lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="px-6 py-8">
          <p className="h-1 w-10 bg-alpine" aria-hidden="true" />
          <p className="mt-4 font-display text-2xl font-bold text-ink">Ice Age Expeditions</p>
          <p className="text-sm font-medium tracking-wide text-alpine uppercase">Ops desk</p>
          <p className="mt-4 text-base font-medium text-ink">{staff.name}</p>
          <p className="text-sm text-muted">{staffRoleLabel(staff.role)}</p>
        </div>
        <nav aria-label="Ops" className="px-3 pb-6">
          <ul className="space-y-1">
            {links.map((link) => {
              const current = link.href === "/ops" ? path === "/ops" : path === link.href || path.startsWith(`${link.href}/`)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-2xl px-4 text-base font-medium ${current ? "bg-alpine-soft text-alpine-deep" : "text-ink hover:bg-canvas"}`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <form action={signOutOps} className="px-6 pb-8">
          <button type="submit" className="min-h-12 text-base font-medium text-alpine-deep hover:underline">
            Sign out
          </button>
        </form>
      </aside>
      <div className="px-4 py-10 sm:px-8 sm:py-12">{children}</div>
    </div>
  )
}

export function OpsHeading({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-semibold tracking-wide text-alpine uppercase">{kicker}</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">{body}</p>
    </header>
  )
}

export function OpsOffline() {
  return (
    <div className="mt-10 rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">The route book is offline</h2>
      <p className="mt-3 text-base leading-relaxed text-muted">These counts are not available until the database answers. Nothing here is a live total.</p>
    </div>
  )
}
