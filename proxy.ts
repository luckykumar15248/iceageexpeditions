import { NextResponse, type NextRequest } from "next/server"
import { readOpsSession } from "@/lib/ops-session"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith("/ops")) return NextResponse.next()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-ops-path", pathname)
  const isLogin = pathname === "/ops/login" || pathname.startsWith("/ops/login/")

  if (!isLogin) {
    const session = await readOpsSession(request.cookies.get("iae_ops")?.value)
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = "/ops/login"
      url.search = ""
      return stamp(NextResponse.redirect(url))
    }
  }

  return stamp(NextResponse.next({ request: { headers: requestHeaders } }))
}

function stamp(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  response.headers.set("Cache-Control", "private, no-store")
  return response
}

export const config = {
  matcher: ["/ops", "/ops/:path*"],
}
