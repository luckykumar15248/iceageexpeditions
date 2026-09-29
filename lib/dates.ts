const KOLKATA = "Asia/Kolkata"

/** Calendar day in Asia/Kolkata as YYYY-MM-DD. */
export function kolkataDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOLKATA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

/** True when the departure date is strictly after today in Asia/Kolkata. */
export function isFutureDepartureDate(startDate: Date, now = new Date()): boolean {
  return kolkataDay(startDate) > kolkataDay(now)
}
