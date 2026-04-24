"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import CurrencySelector from "@/app/components/CurrencySelector";
import CookieBanner from "@/app/components/CookieBanner";
import Footer from "@/app/components/Footer";

export default function ClientRootLayout({ children, fontClass }: { children: React.ReactNode; fontClass?: string }) {
  const pathname = usePathname();

  const isHomepage = pathname === "/";

  const isPartnerAuthPage =
    pathname === "/partner/login" ||
    pathname === "/partner/signup" ||
    pathname === "/partner/application-submitted";

  // Info pages are publicly accessible — they get their own topbar via partner layout
  // but still need the global footer, so we exclude them from isPortalAppPage
  const isPartnerInfoPage =
    pathname === "/partner/terms" ||
    pathname === "/partner/operating-rules" ||
    pathname === "/partner/contact" ||
    pathname === "/partner/privacy" ||
    pathname === "/partner/cookies" ||
    pathname === "/partner/about";

  const isPortalAppPage =
    (pathname?.startsWith("/partner") && !isPartnerAuthPage && !isPartnerInfoPage) ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/driver");

  const isNewCustomerArea =
    pathname?.startsWith("/bookings") ||
    pathname?.startsWith("/book") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/account" ||
    pathname === "/reset-password";

  const isTestBookingArea = pathname?.startsWith("/test-booking");

  const isCustomerPublicPage =
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname === "/cookies" ||
    pathname === "/terms";

  const showCurrencyInHeader = false;
  const showGlobalHeader = !isHomepage && !isPartnerAuthPage && !isPortalAppPage && !isPartnerInfoPage;
  const showCookieBanner = !isPortalAppPage;
  const showCustomerNav  = isNewCustomerArea || isTestBookingArea || isCustomerPublicPage;
  const showFooter       = !isPortalAppPage;

  const [isPartnerLoggedIn,  setIsPartnerLoggedIn]  = useState(false);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [customerName,       setCustomerName]       = useState("");

  useEffect(() => {
    if (showCustomerNav || !showGlobalHeader) return;
    let mounted = true;
    let unsub: (() => void) | undefined;
    async function check() {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (mounted) setIsPartnerLoggedIn(!!data?.user);
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
        if (mounted) setIsPartnerLoggedIn(!!session?.user);
      });
      unsub = () => subscription.unsubscribe();
    }
    check();
    return () => { mounted = false; unsub?.(); };
  }, [showCustomerNav, showGlobalHeader]);

  useEffect(() => {
    if (!showCustomerNav) return;
    let mounted = true;
    let unsub: (() => void) | undefined;
    async function check() {
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      const supabase = createCustomerBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsCustomerLoggedIn(!!data?.user);
      setCustomerName(
        String(data?.user?.user_metadata?.full_name || "").trim() ||
        String(data?.user?.email || "").split("@")[0] || ""
      );
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
        if (mounted) {
          setIsCustomerLoggedIn(!!session?.user);
          setCustomerName(
            String(session?.user?.user_metadata?.full_name || "").trim() ||
            String(session?.user?.email || "").split("@")[0] || ""
          );
        }
      });
      unsub = () => subscription.unsubscribe();
    }
    check();
    return () => { mounted = false; unsub?.(); };
  }, [showCustomerNav]);

  async function handlePartnerLogout() {
    try {
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
      await Promise.race([createBrowserSupabaseClient().auth.signOut(), new Promise(r => setTimeout(r, 3000))]);
    } catch {}
    window.location.replace("/partner/login?reason=signed_out");
  }

  async function handleCustomerLogout() {
    try {
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      await Promise.race([createCustomerBrowserClient().auth.signOut(), new Promise(r => setTimeout(r, 3000))]);
    } catch {}
    window.location.replace("/login?reason=signed_out");
  }

  const bookingsHref   = isTestBookingArea ? "/test-booking/requests" : "/bookings";
  const newBookingHref = isTestBookingArea ? "/test-booking/new"      : "/book";
  const settingsHref   = isTestBookingArea ? "/test-booking/settings" : "/account";
  const loginHref      = isTestBookingArea ? "/test-booking/login"    : "/login";
  const signupHref     = isTestBookingArea ? "/test-booking/signup"   : "/signup";

  return (
    <html lang="en">
      <body className={`${fontClass || ""} min-h-screen flex flex-col ${isHomepage || isNewCustomerArea || isCustomerPublicPage ? "bg-white" : "bg-[#f0f0f0]"}`}>
        <GoogleAnalytics />

        {showGlobalHeader && (
          <>
            <header className="fixed left-0 top-0 z-50 w-full bg-black">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
                <Link href="/" className="flex items-center">
                  <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
                </Link>
                <nav className="flex items-center gap-4">
                  {showCustomerNav ? (
                    <>
                      {showCurrencyInHeader && (
                        <div className="hidden sm:block"><CurrencySelector /></div>
                      )}
                      {isCustomerLoggedIn ? (
                        <>
                          <Link href={newBookingHref} className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">New Booking</Link>
                          <Link href={bookingsHref}   className="hidden text-sm font-bold text-white hover:underline md:block">My Bookings</Link>
                          <Link href={settingsHref}   className="hidden text-sm font-bold text-white hover:underline md:block">Account</Link>
                          {customerName && <span className="hidden text-sm font-bold text-white lg:block">Hi, {customerName}</span>}
                          <button type="button" onClick={handleCustomerLogout} className="border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors">Logout</button>
                        </>
                      ) : (
                        <>
                          <Link href={signupHref} className="hidden text-sm font-bold text-white hover:underline sm:block">Sign Up</Link>
                          <Link href={loginHref}  className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">Log In</Link>
                        </>
                      )}
                    </>
                  ) : !isPartnerLoggedIn ? (
                    <>
                      <Link href="/partner/signup" className="text-sm font-bold text-white hover:underline">Partner Sign Up</Link>
                      <Link href="/partner/login"  className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">Partner Login</Link>
                    </>
                  ) : (
                    <button type="button" onClick={handlePartnerLogout} className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-95 transition-opacity">Logout</button>
                  )}
                </nav>
              </div>
            </header>
            <div className="h-[76px]" />
          </>
        )}

        <main className="flex-1">{children}</main>
        {showFooter && <Footer />}
        {showCookieBanner && <CookieBanner />}
      </body>
    </html>
  );
}