import { NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

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
    const supabase = await createRouteHandlerSupabaseClient();
    const { data } = await supabase.auth.getUser();

    const email = (data?.user?.email || "").toLowerCase().trim();
    const isAdmin = !!email && getAdminEmails().includes(email);

    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}