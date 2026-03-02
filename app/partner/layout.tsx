"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function PartnerLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setLoggedIn(!!data?.user);
      setChecking(false);
    }

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/partner/login?reason=signed_out");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const linkClass = (href: string) =>
    `rounded-full px-3 py-2 hover:bg-white/10 ${
      isActive(href) ? "bg-white/15" : ""
    }`;

  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      {/* Header */}
      <header className="fixed left-0 top-0 z-50 w-full shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
        <div className="bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
          {/* Keep header nicely bounded (not too wide) */}
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
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

              <Link
                href="/partner/signup"
                className={linkClass("/partner/signup")}
              >
                Partner Sign Up
              </Link>

              <Link
                href="/partner/login"
                className={linkClass("/partner/login")}
              >
                Partner Login
              </Link>

              {!checking && loggedIn ? (
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

      {/* ✅ This is what fixes “full width” pages */}
      <main className="px-6 py-10">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}