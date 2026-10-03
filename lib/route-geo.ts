/**
 * Coordinate rules shared by the ops editor (client) and the save path (server).
 * Bounds cover the Himalaya and its approach towns. A swapped latitude and
 * longitude for any Indian Himalayan point falls outside them.
 */
export const ROUTE_BOUNDS = {
  minLatitude: 20,
  maxLatitude: 45,
  minLongitude: 60,
  maxLongitude: 100,
} as const

export const ROUTE_ALTITUDE_MAX = 8000

const DEGREES = /^-?\d{1,3}(?:\.\d{1,6})?$/
const PAIR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

export type RoutePoint = {
  label: string
  dayNumber: number | null
  latitude: number
  longitude: number
  altitudeMeters: number | null
  highPointName: string | null
  highPointAltitudeMeters: number | null
}

export function decimalOrNull(value: { toNumber(): number } | null): number | null {
  if (value == null) return null
  const number = value.toNumber()
  return Number.isFinite(number) ? number : null
}

export function parseDegrees(text: string): number | null {
  const trimmed = text.trim()
  if (!DEGREES.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export function latitudeInRange(value: number): boolean {
  return value >= ROUTE_BOUNDS.minLatitude && value <= ROUTE_BOUNDS.maxLatitude
}

export function longitudeInRange(value: number): boolean {
  return value >= ROUTE_BOUNDS.minLongitude && value <= ROUTE_BOUNDS.maxLongitude
}

/** Splits a pasted "34.1526, 77.5771" pair into latitude and longitude strings, rounded to 6 decimals. */
export function splitCoordinatePair(text: string): [string, string] | null {
  const match = PAIR.exec(text)
  if (!match?.[1] || !match[2]) return null
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return [trimDecimals(latitude), trimDecimals(longitude)]
}

function trimDecimals(value: number): string {
  return String(Number(value.toFixed(6)))
}

/** Field-level problems for an optional latitude/longitude pair typed as text. */
export function coordinateProblems(latitudeText: string, longitudeText: string): { latitude?: string; longitude?: string } {
  const latText = latitudeText.trim()
  const lngText = longitudeText.trim()
  if (!latText && !lngText) return {}
  const problems: { latitude?: string; longitude?: string } = {}
  if (!latText) problems.latitude = "Add the latitude too, or clear the longitude."
  if (!lngText) problems.longitude = "Add the longitude too, or clear the latitude."
  if (latText) {
    const latitude = parseDegrees(latText)
    if (latitude == null) problems.latitude = "Use decimal degrees with up to 6 decimals, for example 34.1526."
    else if (!latitudeInRange(latitude)) {
      problems.latitude = `Latitude must be between ${ROUTE_BOUNDS.minLatitude}° and ${ROUTE_BOUNDS.maxLatitude}° N. Check that latitude and longitude are not swapped.`
    }
  }
  if (lngText) {
    const longitude = parseDegrees(lngText)
    if (longitude == null) problems.longitude = "Use decimal degrees with up to 6 decimals, for example 77.5771."
    else if (!longitudeInRange(longitude)) {
      problems.longitude = `Longitude must be between ${ROUTE_BOUNDS.minLongitude}° and ${ROUTE_BOUNDS.maxLongitude}° E. Check that latitude and longitude are not swapped.`
    }
  }
  return problems
}
