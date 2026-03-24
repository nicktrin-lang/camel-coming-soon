import { NextRequest, NextResponse } from "next/server";

const MAIN_HOSTS = new Set(["camel-global.com", "www.camel-global.com"]);
const PORTAL_HOST = "portal.camel-global.com";
const TEST_HOST = "test.camel-global.com";

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/vercel.svg") ||
    pathname.startsWith("/camel-logo.png") ||
    pathname.startsWith("/globe.svg") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$/i) !== null
  );
}

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0];
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // MAIN DOMAIN:
  // partner/admin paths should live on the portal subdomain
  const isPartnerOrAdminPath =
    pathname.startsWith("/partner") || pathname.startsWith("/admin");

  if (MAIN_HOSTS.has(host) && isPartnerOrAdminPath) {
    const redirectUrl = new URL(req.url);
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = PORTAL_HOST;
    redirectUrl.pathname = pathname;
    redirectUrl.search = url.search;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // TEST DOMAIN:
  // DO NOT redirect "/" anymore.
  // We want test.camel-global.com to show the new customer homepage from app/page.tsx

  // Optional safety:
  // if someone tries partner/admin routes on the test domain,
  // send them into the customer staging area instead
  if (
    host === TEST_HOST &&
    (pathname.startsWith("/partner") || pathname.startsWith("/admin"))
  ) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/test-booking";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};