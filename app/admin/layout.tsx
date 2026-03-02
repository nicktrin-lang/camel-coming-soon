"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);

      const admins = getAdminEmails();
      const { data, error } = await supabase.auth.getUser();
      const email = (data?.user?.email || "").toLowerCase();

      const ok = !error && !!data?.user && admins.includes(email);

      if (!mounted) return;
      setIsAdmin(ok);
      setChecking(false);

      if (!ok) {
        // Kick non-admins to partner login (same behaviour as your partner gating)
        router.replace("/partner/login?reason=not_authorized");
      }
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/partner/login?reason=signed_out");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const linkClass = (href: string) =>
    `rounded-full px-3 py-2 hover:bg-white/10 ${isActive(href) ? "bg-white/15" : ""}`;

  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      {/* Header */}
      <header className="fixed left-0 top-0 z-50 w-full shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
        <div className="bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/camel-logo.png"
                alt="Camel Global Ltd logo"
                width={220}
                height={80}
                priority
                className="h-[64px] w-auto"
              />
            </Link>

            {/* Nav */}
            <nav className="ml-auto flex items-center gap-3 text-sm">
              <Link href="/" className={linkClass("/")}>
                Home
              </Link>

              <Link href="/admin/approvals" className={linkClass("/admin/approvals")}>
                Admin Approvals
              </Link>

              {!checking && isAdmin ? (
                <button
                  onClick={handleLogout}
                  className="ml-2 rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                >
                  Logout
                </button>
              ) : null}
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[105px] md:h-[115px]" />

      {/* Centered white card wrapper */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-white shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
          <div className="p-6 md:p-10">{children}</div>
        </div>
      </main>
    </div>
  );
}