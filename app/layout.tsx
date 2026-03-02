// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data?.user);
    }

    checkUser();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/partner/login?reason=signed_out");
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#e8f1f8]">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-[#003768] to-[#005b9f] px-6 py-4 text-white shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">Camel</span>
            </Link>

            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/">Home</Link>

              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow hover:opacity-95"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto max-w-7xl px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}