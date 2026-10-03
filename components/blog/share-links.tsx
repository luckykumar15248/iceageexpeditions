"use client"

import { useState, useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

function useCanNativeShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  )
}

const linkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink transition hover:border-alpine hover:text-alpine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alpine motion-reduce:transition-none"

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const canShare = useCanNativeShare()
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle")
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const targets = [
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: "Email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ]

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied("copied")
    } catch {
      setCopied("failed")
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setCopied("failed")
    }
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label="Share this article">
        {canShare ? (
          <li>
            <button type="button" onClick={nativeShare} className={`${linkClass} border-alpine bg-alpine text-white hover:bg-alpine-deep hover:text-white`}>
              Share…
            </button>
          </li>
        ) : null}
        {targets.map((target) => (
          <li key={target.label}>
            <a
              href={target.href}
              target={target.label === "Email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className={linkClass}
              aria-label={`Share on ${target.label}${target.label === "Email" ? "" : " (opens in a new tab)"}`}
            >
              {target.label}
            </a>
          </li>
        ))}
        <li>
          <button type="button" onClick={copy} className={linkClass}>
            {copied === "copied" ? "Link copied" : "Copy link"}
          </button>
        </li>
      </ul>
      <p className="sr-only" aria-live="polite">
        {copied === "copied" ? "Link copied to clipboard." : ""}
      </p>
      {copied === "failed" ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          Sharing did not work in this browser. Copy the address from the address bar instead.
        </p>
      ) : null}
    </div>
  )
}
