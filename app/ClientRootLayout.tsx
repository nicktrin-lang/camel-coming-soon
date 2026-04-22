"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import CookieBanner from "@/app/components/CookieBanner";
import Footer from "@/app/components/Footer";

export default function ClientRootLayout({ children, fontClass }: { children: React.ReactNode; fontClass?: string }) {
  const pathname = usePathname();

  const isHomepage = pathname === "/";

  const isPartnerAuthPage =
    pathname === "/partner/login" ||
    pathname === "/partner/signup" ||
    pathname === "/partner/application-submitted";

  const isPortalAppPage =
    (pathname?.startsWith("/partner") && !isPartnerAuthPage) ||
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

  // Currency selector only on booking-related pages, NOT on homepage (it's in the widget)
  const showCurrencyInHeader = (isNewCustomerArea || isTestBookingArea) && !isHomepage;

  const showGlobalHeader = !isHomepage && !isPartnerAuthPage && !isPortalAppPage;
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
      <body className={`${fontClass || ""} min-h-screen flex flex-col ${isHomepage || isNewCustomerArea || isCustomerPublicPage ? "bg-white" : "bg-[#e3f4ff]"}`}>
        <GoogleAnalytics />

        {showGlobalHeader && (
          <>
            <header className="fixed left-0 top-0 z-50 w-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <div className={showCustomerNav ? "bg-black" : "bg-gradient-to-br from-[#003768] to-[#005b9f]"}>
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
                  <Link href="/" className="flex items-center">
                    <Image src="/camel-logo.png" alt="Camel Global" width={180} height={64} priority
                      className={`h-14 w-auto ${showCustomerNav ? "brightness-0 invert" : ""}`} />
                  </Link>

                  <nav className="ml-auto flex items-center gap-3 text-sm font-medium">
                    {showCustomerNav ? (
                      <>
                        {showCurrencyInHeader && (
                          <div className="hidden sm:block">
                            {/* Lazy import CurrencySelector only when needed */}
                            {(() => {
                              const CurrencySelector = require("@/app/components/CurrencySelector").default;
                              return <CurrencySelector />;
                            })()}
                          </div>
                        )}
                        {isCustomerLoggedIn ? (
                          <>
                            <Link href={newBookingHref}
                              className="bg-[#ff7a00] text-white px-3 py-2 text-xs font-bold hover:opacity-90 transition-opacity">
                              New Booking
                            </Link>
                            <Link href={bookingsHref} className="text-white/70 hover:text-white transition-colors text-xs hidden md:block">My Bookings</Link>
                            <Link href={settingsHref} className="text-white/70 hover:text-white transition-colors text-xs hidden md:block">Account</Link>
                            {customerName && <span className="hidden text-sm font-bold text-white lg:block">Hi, {customerName}</span>}
                            <button type="button" onClick={handleCustomerLogout}
                              className="border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors">
                              Logout
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href={signupHref} className="text-white/70 hover:text-white transition-colors text-sm font-semibold hidden sm:block">
                              Sign Up
                            </Link>
                            <Link href={loginHref}
                              className="border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                              Log In
                            </Link>
                          </>
                        )}
                      </>
                    ) : !isPartnerLoggedIn ? (
                      <>
                        <Link href="/partner/signup" className="text-white/80 hover:text-white transition-colors">Partner Sign Up</Link>
                        <Link href="/partner/login"
                          className="bg-[#ff7a00] text-white px-4 py-2 font-semibold hover:opacity-90 transition-opacity">
                          Partner Login
                        </Link>
                      </>
                    ) : (
                      <button type="button" onClick={handlePartnerLogout}
                        className="bg-[#ff7a00] px-5 py-2 font-semibold text-white hover:opacity-95">
                        Logout
                      </button>
                    )}
                  </nav>
                </div>
              </div>
            </header>
            <div className="h-[72px]" />
          </>
        )}

        <main className="flex-1">{children}</main>
        {showFooter && <Footer />}
        {showCookieBanner && <CookieBanner />}
      </body>
    </html>
  );
}