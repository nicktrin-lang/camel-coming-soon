import { NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = await createRouteHandlerSupabaseClient();

    const {
      data: { user },
      error: userErr,
    } = await db.auth.getUser();

    if (userErr || !user?.email) {
      return NextResponse.json({ role: "partner" }, { status: 200 });
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    const { data: adminRow } = await db
      .from("admin_users")
      .select("role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json({ role: "partner" }, { status: 200 });
    }

    return NextResponse.json(
      {
        role:
          adminRow.role === "super_admin"
            ? "super_admin"
            : adminRow.role === "admin"
              ? "admin"
              : "partner",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ role: "partner" }, { status: 200 });
  }
}
