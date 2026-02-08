import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for public assets
  if (
    pathname.startsWith("/images/") ||
    pathname.startsWith("/logos/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/sounds/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Prevent browser bfcache from serving stale dashboard pages
  // This ensures the back button always re-validates auth
  const response = NextResponse.next()
  if (!pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    response.headers.set("Pragma", "no-cache")
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
