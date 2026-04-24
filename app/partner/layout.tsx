"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PortalSidebar, { PortalRole } from "@/app/components/portal/PortalSidebar";
import PortalTopbar from "@/app/components/portal/PortalTopbar";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function clearStaleSupabaseLocks() {
  try {
    Object.keys(localStorage)
      .filter(k => k.includes("sb-") || k.includes("supabase"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

async function getUserWithTimeout(supabase: any, ms = 8000) {
  const userPromise = supabase.auth.getUser();
  const timeout = new Promise<{ data: null; error: Error }>(resolve =>
    setTimeout(() => resolve({ data: null, error: new Error("timeout") }), ms)
  );
  return Promise.race([userPromise, timeout]);
}

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();
  const pathname = usePathname();

  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role,        setRole]        = useState<PortalRole>("partner");
  const [timedOut,    setTimedOut]    = useState(false);
  const [authed,      setAuthed]      = useState(false);

  // Pages that need NO auth and NO layout at all
  const isUnauthPublicPage =
    pathname === "/partner/login" ||
    pathname === "/partner/reset-password" ||
    pathname === "/partner/application-submitted" ||
    pathname === "/partner/signup" ||
    pathname.startsWith("/partner/signup/");

  // Pages that show WITH topbar+footer but NOT sidebar, visible to anyone
  // (logged-in users get sidebar too; unauthenticated users just get topbar+footer)
  const isPartnerInfoPage =
    pathname === "/partner/terms" ||
    pathname === "/partner/operating-rules" ||
    pathname === "/partner/contact" ||
    pathname === "/partner/privacy" ||
    pathname === "/partner/cookies" ||
    pathname === "/partner/about";

  useEffect(() => {
    let mounted = true;
    async function guard() {
      // Fully public pages — no layout, no auth check
      if (isUnauthPublicPage) { setLoading(false); return; }

      setLoading(true);
      try {
        const { data: userData, error: userErr } = await getUserWithTimeout(supabase);
        if (!mounted) return;

        if (userErr?.message === "timeout") {
          clearStaleSupabaseLocks();
          setTimedOut(true);
          setLoading(false);
          return;
        }

        // Not logged in
        if (userErr || !userData?.user) {
          if (!mounted) return;
          // Info pages are public — show them with topbar but no sidebar
          if (isPartnerInfoPage) { setAuthed(false); setLoading(false); return; }
          // Everything else requires login
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        // Logged in — check role
        let nextRole: PortalRole = "partner";
        try {
          const meRes = await fetch("/api/admin/me", { method: "GET", cache: "no-store", credentials: "include" });
          if (meRes.ok) {
            const meJson = await safeJson(meRes);
            nextRole =
              meJson?.role === "super_admin" ? "super_admin" :
              meJson?.role === "admin"       ? "admin"       : "partner";
          }
        } catch { nextRole = "partner"; }
        if (!mounted) return;

        // Admins hitting partner info pages → redirect to /admin/* equivalents
        if (nextRole === "admin" || nextRole === "super_admin") {
          if (isPartnerInfoPage) {
            router.replace(pathname.replace("/partner/", "/admin/"));
            return;
          }
          router.replace("/admin/approvals");
          return;
        }

        setRole(nextRole);
        setAuthed(true);
      } catch {
        if (!mounted) return;
        setRole("partner");
        setAuthed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    guard();
    return () => { mounted = false; };
  }, [router, supabase, isUnauthPublicPage, isPartnerInfoPage, pathname]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Fully public pages — no layout at all
  if (isUnauthPublicPage) return <>{children}</>;

  if (timedOut) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] pt-[68px]">
        <div className="px-4 py-8 md:px-8">
          <div className="border border-red-200 bg-white p-8">
            <h2 className="text-xl font-black text-red-700">Session error</h2>
            <p className="mt-2 text-sm font-semibold text-black/60">Your session has a conflict. Click below to clear it and log in again.</p>
            <button type="button"
              onClick={() => { clearStaleSupabaseLocks(); window.location.href = "/partner/login?reason=not_signed_in"; }}
              className="mt-4 bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90">
              Clear session &amp; log in again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] pt-[68px]">
        <div className="px-4 py-8 md:px-8">
          <div className="border border-black/5 bg-white p-8">
            <p className="text-sm font-semibold text-black/50">Loading portal…</p>
          </div>
        </div>
      </div>
    );
  }

  // Info pages visible to unauthenticated users: topbar + content + footer, no sidebar
  if (isPartnerInfoPage && !authed) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <PortalTopbar onMenuClick={() => {}} />
        <div className="pt-[68px]">
          <div className="px-4 py-5 md:px-8 md:py-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // All authenticated pages — full sidebar + topbar
  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <PortalTopbar onMenuClick={() => setSidebarOpen(true)} />
      <PortalSidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pt-[68px] lg:pl-[290px]">
        <div className={pathname === "/partner/onboarding" ? "p-0" : "px-4 py-5 md:px-8 md:py-8"}>
          {children}
        </div>
      </div>
    </div>
  );
}