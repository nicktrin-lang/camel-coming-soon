import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { user_id, full_name, phone } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Use service role to bypass RLS — session may not be established
    // immediately after signUp when email confirmation is enabled
    const db = createServiceRoleSupabaseClient();

    const { error } = await db
      .from("customer_profiles")
      .upsert({ user_id, full_name: full_name || null, phone: phone || null });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}