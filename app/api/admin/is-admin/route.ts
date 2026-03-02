import { NextResponse } from "next/server";
import { createAuthedServerSupabaseClient } from "@/lib/supabase/server";

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
    const supabase = createAuthedServerSupabaseClient();

    const { data, error } = await supabase.auth.getUser();
    const email = (data?.user?.email || "").toLowerCase().trim();

    if (error || !email) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const admins = getAdminEmails();
    return NextResponse.json({ isAdmin: admins.includes(email) }, { status: 200 });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}