import { enquiriesToCsv, loadEnquiryExport, parseEnquiryFilters } from "@/lib/enquiry-desk"

export async function GET(request: Request) {
  const filters = parseEnquiryFilters(new URL(request.url).searchParams)
  const rows = await loadEnquiryExport({ ...filters, page: 1, lead: undefined })
  if (rows === "offline") {
    return new Response("The desk is offline. No spreadsheet was created.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "private, no-store",
      },
    })
  }
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  return new Response(enquiriesToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ice-age-enquiries-${stamp}.csv"`,
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    },
  })
}
