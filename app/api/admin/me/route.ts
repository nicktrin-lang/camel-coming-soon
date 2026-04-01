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

    const { data: adminRow } = await db
      .from("admins")
      .select("role")
      .eq("email", user.email)
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