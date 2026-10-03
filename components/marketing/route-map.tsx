"use client"

import dynamic from "next/dynamic"
import { Component, type ReactNode } from "react"
import type { RoutePoint } from "@/lib/route-geo"

const RouteMapCanvas = dynamic(() => import("./route-map-canvas"), {
  ssr: false,
  loading: () => <MapNotice>Loading the route map…</MapNotice>,
})

export function RouteMap({ points, title }: { points: RoutePoint[]; title: string }) {
  return (
    <div
      role="region"
      aria-label={`Route map for ${title}. Camp points are also listed after the map.`}
      className="relative isolate h-[22rem] overflow-hidden rounded-3xl border border-line bg-canvas sm:h-[28rem]"
    >
      <MapErrorBoundary fallback={<MapNotice>The map could not load on this connection. The camp list below has the same route.</MapNotice>}>
        <RouteMapCanvas points={points} />
      </MapErrorBoundary>
    </div>
  )
}

function MapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <p className="max-w-sm text-base leading-relaxed text-muted" role="status">
        {children}
      </p>
    </div>
  )
}

class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error("[route-map] map failed to render", error instanceof Error ? error.message : String(error))
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
