import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Public paths — never redirect
  const publicPaths = [
    "/driver/login",
    "/driver/signup",
    "/partner/login",
    "/partner/signup",
    "/partner/application-submitted",
  ];

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return res;
  }

  // Only guard driver routes here — partner/admin routes are guarded client-side
  if (!pathname.startsWith("/driver")) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/driver/login";
    loginUrl.searchParams.set("reason", "not_signed_in");
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/driver/:path*"],
};