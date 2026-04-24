"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PortalSidebar, { PortalRole } from "@/app/components/portal/PortalSidebar";
import PortalTopbar from "@/app/components/portal/PortalTopbar";
import Footer from "@/app/components/Footer";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<PortalRole>("admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        if (!mounted) return;
        setChecking(false);
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      try {
        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const meJson = await meRes.json().catch(() => null);

        const nextRole =
          meJson?.role === "super_admin"
            ? "super_admin"
            : meJson?.role === "admin"
              ? "admin"
              : null;

        if (!mounted) return;

        if (!nextRole) {
          setChecking(false);
          router.replace("/partner/login?reason=not_authorized");
          return;
        }

        setRole(nextRole);
        setChecking(false);
      } catch {
        if (!mounted) return;
        setChecking(false);
        router.replace("/partner/login?reason=not_authorized");
      }
    }

    check();

    return () => { mounted = false; };
  }, [supabase, router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] pt-[76px]">
        <div className="px-4 py-8 md:px-8">
          <div className="border border-black/5 bg-white p-8">
            <p className="text-sm font-semibold text-black/50">Checking admin access…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
      <PortalTopbar onMenuClick={() => setSidebarOpen(true)} />

      <PortalSidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="pt-[76px] lg:pl-[290px] flex-1">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>

      <div className="lg:pl-[290px]">
        <Footer />
      </div>
    </div>
  );
}