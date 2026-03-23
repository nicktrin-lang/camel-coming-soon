import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  const db = createServiceRoleSupabaseClient();

  const { data } = await db
    .from("partner_drivers")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!data) {
    return NextResponse.json(
      { error: "Driver not found. Contact your partner." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}