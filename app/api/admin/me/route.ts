import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET() {
  try {
    const authDb = await createRouteHandlerSupabaseClient();

    const {
      data: { user },
      error: userErr,
    } = await authDb.auth.getUser();

    if (userErr || !user?.email) {
      return NextResponse.json({ role: "partner" }, { status: 200 });
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    const adminDb = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await adminDb
      .from("admin_users")
      .select("email, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (adminErr || !adminRow) {
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