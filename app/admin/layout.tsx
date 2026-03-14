"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import AdminTopbar from "@/app/components/admin/AdminTopbar";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/admin/approvals": {
    title: "Admin Approvals",
    subtitle: "Review partner applications and approve or reject them.",
  },
  "/admin/users": {
    title: "Admin Users",
    subtitle: "Manage administrative user accounts and permissions.",
  },
};

function getMeta(pathname: string) {
  for (const key of Object.keys(pageMeta)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      return pageMeta[key];
    }
  }

  return {
    title: "Admin Portal",
    subtitle: "System administration",
  };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        if (!mounted) return;
        setIsAdmin(false);
        setChecking(false);
        window.location.replace("/partner/login?reason=not_authorized");
        return;
      }

      try {
        const adminRes = await fetch("/api/admin/is-admin", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const adminJson = await adminRes.json().catch(() => null);
        const ok = !!adminJson?.isAdmin;

        if (!mounted) return;

        setIsAdmin(ok);
        setChecking(false);

        if (!ok) {
          window.location.replace("/partner/login?reason=not_authorized");
        }
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
        setChecking(false);
        window.location.replace("/partner/login?reason=not_authorized");
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const meta = getMeta(pathname || "");

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-115px)] bg-[#e3f4ff] px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Checking admin access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-115px)] bg-[#e3f4ff]">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[290px]">
        <AdminTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}