"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const PUBLIC_DRIVER_PATHS = ["/driver/login", "/driver/signup"];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState("");

  const isPublic = PUBLIC_DRIVER_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublic) { setLoading(false); return; }

    let mounted = true;
    async function guard() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) {
        router.replace("/driver/login?reason=not_signed_in");
        return;
      }
      // Try to get driver name from email as fallback
      setDriverName(
        String(data.user.user_metadata?.full_name || "").trim() ||
        String(data.user.email || "").split("@")[0] || ""
      );
      setLoading(false);
    }
    guard();
    return () => { mounted = false; };
  }, [isPublic, router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/driver/login?reason=signed_out");
  }

  if (isPublic) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e3f4ff] pt-20">
        <div className="px-4 py-8">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-slate-600">Loading driver portal…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <Link href="/driver/jobs" className="flex items-center">
            <Image
              src="/camel-logo.png"
              alt="Camel Global"
              width={180}
              height={60}
              priority
              className="h-[52px] w-auto"
            />
          </Link>

          <div className="flex items-center gap-3">
            {driverName ? (
              <span className="hidden text-sm font-semibold text-white/95 md:block">
                {driverName}
              </span>
            ) : null}

            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              Driver
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-black/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
        <div className="flex">
          <Link
            href="/driver/jobs"
            className={[
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition",
              pathname === "/driver/jobs"
                ? "text-[#003768]"
                : "text-slate-500",
            ].join(" ")}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            Jobs
          </Link>
        </div>
      </nav>

      <div className="pt-20 pb-20 md:pb-0">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}