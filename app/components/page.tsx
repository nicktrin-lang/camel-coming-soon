"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

type Props = {
  /** show links as buttons (like your orange Dashboard button) */
  variant?: "buttons" | "links";
};

export default function AdminNavLinks({ variant = "buttons" }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      const admins = getAdminEmails();
      const { data } = await supabase.auth.getUser();
      const email = (data?.user?.email || "").toLowerCase().trim();
      const ok = !!email && admins.includes(email);

      if (alive) setIsAdmin(ok);
    }

    run();
    const { data: sub } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!isAdmin) return null;

  // Buttons match your UI
  if (variant === "buttons") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/partner/dashboard"
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#003768] hover:bg-black/5"
        >
          Partner Dashboard
        </Link>

        <Link
          href="/admin/approvals"
          className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
        >
          Admin Approvals
        </Link>
      </div>
    );
  }

  // (Optional) plain links if you ever want them
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/partner/dashboard" className="hover:underline">
        Partner Dashboard
      </Link>
      <Link href="/admin/approvals" className="hover:underline">
        Admin Approvals
      </Link>
    </div>
  );
}