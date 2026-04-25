import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Production domains that should show the coming soon page
const COMING_SOON_HOSTS = [
  "camel-global.com",
  "www.camel-global.com",
];

// Paths that should always work even on production (API routes, assets)
const BYPASS_PATHS = [
  "/coming-soon",
  "/_next",
  "/api",
  "/favicon.ico",
  "/camel-logo.png",
  "/robots.txt",
];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Only intercept production domains
  if (!COMING_SOON_HOSTS.includes(host)) return NextResponse.next();

  // Allow bypass paths through
  if (BYPASS_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Redirect everything else to coming soon
  if (pathname !== "/coming-soon") {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};