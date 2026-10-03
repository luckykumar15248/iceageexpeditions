"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const links = [
  { href: "/expeditions?vehicle=SUV_4X4", label: "4x4 SUV", match: "SUV_4X4" },
  { href: "/expeditions?vehicle=MOTORBIKE", label: "Motorbike", match: "MOTORBIKE" },
  { href: "/safety", label: "Safety", match: "" },
  { href: "/gallery", label: "Gallery", match: "" },
  { href: "/blog", label: "Blog", match: "" },
  { href: "/gear", label: "Gear", match: "" },
  { href: "/faq", label: "FAQ", match: "" },
  { href: "/contact", label: "Contact", match: "" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper shadow-sm">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="leading-tight">
          <span className="block font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
            Ice Age Expeditions
          </span>
          <span className="text-sm font-medium text-alpine sm:text-base">The Era of Trails</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {links.map((link) => {
            const current = link.match ? false : pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "border-b-2 border-alpine pb-0.5 text-base font-semibold text-alpine"
                    : "pb-0.5 text-base font-medium text-ink hover:text-alpine"
                }
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/enquire"
            className="inline-flex min-h-12 items-center rounded-md bg-alpine px-5 text-base font-semibold text-white hover:bg-alpine-deep"
          >
            Enquire / Book
          </Link>
        </nav>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line text-sm font-semibold text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true">{open ? "Close" : "Menu"}</span>
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-paper px-4 py-3 lg:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-12 items-center text-base text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/enquire"
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-alpine px-4 font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Enquire / Book
          </Link>
        </nav>
      ) : null}
    </header>
  )
}
