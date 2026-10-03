"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useMemo, useSyncExternalStore } from "react"
import { LayersControl, MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet"
import type { RoutePoint } from "@/lib/route-geo"

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const TOPO_ATTRIBUTION = `${OSM_ATTRIBUTION}, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`

export default function RouteMapCanvas({ points }: { points: RoutePoint[] }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const coarsePointer = useMediaQuery("(pointer: coarse)")
  const line = useMemo(() => points.map((point) => [point.latitude, point.longitude] as [number, number]), [points])
  const bounds = useMemo(() => L.latLngBounds(line), [line])
  const lastIndex = points.length - 1

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [56, 56], maxZoom: 11 }}
      scrollWheelZoom={false}
      dragging={!coarsePointer}
      zoomAnimation={!reducedMotion}
      fadeAnimation={!reducedMotion}
      markerZoomAnimation={!reducedMotion}
      className="route-map h-full w-full"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Road map">
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={OSM_ATTRIBUTION} maxZoom={18} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain">
          <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution={TOPO_ATTRIBUTION} maxZoom={17} />
        </LayersControl.BaseLayer>
      </LayersControl>
      <Polyline positions={line} pathOptions={{ className: "route-line-casing", weight: 8, opacity: 0.9, interactive: false }} />
      <Polyline positions={line} pathOptions={{ className: "route-line", weight: 4, opacity: 1, interactive: false }} />
      {points.map((point, index) => (
        <Marker
          key={`${point.dayNumber ?? "start"}-${index}`}
          position={[point.latitude, point.longitude]}
          icon={pinIcon(point, index === lastIndex)}
          keyboard
        >
          <Tooltip direction="auto" className="route-tooltip">
            <strong className="block font-semibold">{pointHeading(point)}</strong>
            <span className="block">{altitudeLine(point)}</span>
            {point.highPointName && point.highPointAltitudeMeters != null ? (
              <span className="block text-muted">
                High point: {point.highPointName}, {formatMetres(point.highPointAltitudeMeters)}
              </span>
            ) : null}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}

function pinIcon(point: RoutePoint, last: boolean): L.DivIcon {
  const start = point.dayNumber == null
  const tone = start
    ? "border-alpine bg-paper text-alpine-deep"
    : last
      ? "border-white bg-alpine-deep text-white"
      : "border-white bg-alpine text-white"
  const glyph = start ? "S" : String(point.dayNumber)
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [20, 0],
    html: `<span class="grid size-[34px] place-items-center rounded-full border-2 ${tone} text-sm font-bold shadow-[0_4px_12px_rgba(26,29,27,0.25)]"><span aria-hidden="true">${glyph}</span><span class="sr-only">${escapeHtml(`${pointHeading(point)}, ${altitudeLine(point)}`)}</span></span>`,
  })
}

function pointHeading(point: RoutePoint): string {
  return point.dayNumber == null ? `Start: ${point.label}` : `Day ${point.dayNumber}: ${point.label}`
}

function altitudeLine(point: RoutePoint): string {
  if (point.altitudeMeters == null) return "Altitude not listed"
  return point.dayNumber == null ? `${formatMetres(point.altitudeMeters)}` : `Sleep ${formatMetres(point.altitudeMeters)}`
}

function formatMetres(value: number): string {
  return `${value.toLocaleString("en-IN")} m`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
