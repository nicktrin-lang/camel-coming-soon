import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // If user visits portal.camel-global.com
  if (host.startsWith("portal.camel-global.com")) {
    if (!url.pathname.startsWith("/partner") && !url.pathname.startsWith("/admin")) {
      url.pathname = "/partner/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};