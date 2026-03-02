import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getAdminEmails() {
  const raw =
    process.env.CAMEL_ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Who is logged in (cookie-based)
    const { data, error } = await supabase.auth.getUser();

    const email = (data?.user?.email || "").toLowerCase().trim();
    if (error || !email) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const admins = getAdminEmails();
    const isAdmin = admins.includes(email);

    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch {
    // Never crash login flow
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}