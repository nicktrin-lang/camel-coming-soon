import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email, auth_user_id } = await req.json();

  const db = createServiceRoleSupabaseClient();

  await db
    .from("partner_drivers")
    .update({
      auth_user_id,
      updated_at: new Date().toISOString(),
    })
    .ilike("email", email.trim());

  return NextResponse.json({ ok: true });
}