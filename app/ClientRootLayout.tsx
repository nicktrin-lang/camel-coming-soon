"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import CurrencySelector from "@/app/components/CurrencySelector";
import CookieBanner from "@/app/components/CookieBanner";
import Footer from "@/app/components/Footer";

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
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

  // New customer booking URLs
  const isNewCustomerArea =
    pathname?.startsWith("/bookings") ||
    pathname?.startsWith("/book") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/account" ||
    pathname === "/reset-password";

  // Legacy test-booking area (kept as-is)
  const isTestBookingArea = pathname?.startsWith("/test-booking");

  // Customer public info pages — header shown but NO currency selector
  const isCustomerPublicPage =
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname === "/cookies" ||
    pathname === "/terms";

  // Show the currency selector only on booking-related pages, not info pages
  const showCurrencyInHeader = isNewCustomerArea || isTestBookingArea;

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
      <body className={`min-h-screen flex flex-col ${isHomepage ? "bg-white" : "bg-[#e3f4ff]"}`}>
        <GoogleAnalytics />

        {showGlobalHeader && (
          <>
            <header className="fixed left-0 top-0 z-50 w-full shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
              <div className="bg-white border-b border-black/8">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
                  <Link href="/" className="flex items-center">
                    <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} priority className="h-12 w-auto" />
                  </Link>

                  <nav className="ml-auto flex items-center gap-3 text-sm font-medium">
                    <Link href="/" className="text-slate-600 hover:text-black transition-colors hidden sm:block">Home</Link>

                    {showCustomerNav ? (
                      <>
                        {/* Currency selector only on booking pages, not info pages */}
                        {showCurrencyInHeader && <CurrencySelector />}

                        {isCustomerLoggedIn ? (
                          <>
                            <Link href={newBookingHref}
                              className="bg-black text-white px-4 py-2 text-xs font-bold hover:bg-black/80 transition-colors rounded-lg">
                              New Booking
                            </Link>
                            <Link href={bookingsHref} className="text-slate-600 hover:text-black transition-colors text-xs hidden md:block">My Bookings</Link>
                            <Link href={settingsHref} className="text-slate-600 hover:text-black transition-colors text-xs hidden md:block">Account</Link>
                            {customerName && <span className="hidden text-xs text-slate-400 lg:block">Hi, {customerName}</span>}
                            <button type="button" onClick={handleCustomerLogout}
                              className="border border-black/20 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-black/5 transition-colors rounded-lg">
                              Logout
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href={signupHref}
                              className="text-slate-600 hover:text-black transition-colors text-sm font-semibold">
                              Sign Up
                            </Link>
                            <Link href={loginHref}
                              className="bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-black/80 transition-colors rounded-lg">
                              Log In
                            </Link>
                          </>
                        )}
                      </>
                    ) : !isPartnerLoggedIn ? (
                      <>
                        <Link href="/partner/signup" className="text-slate-600 hover:text-black transition-colors">Partner Sign Up</Link>
                        <Link href="/partner/login"
                          className="bg-black text-white px-4 py-2 font-semibold hover:bg-black/80 transition-colors rounded-lg">
                          Partner Login
                        </Link>
                      </>
                    ) : (
                      <button type="button" onClick={handlePartnerLogout}
                        className="bg-[#ff7a00] px-5 py-2 font-semibold text-white hover:opacity-95 rounded-lg">
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