import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

async function getCurrentUserEmail() {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data?.user?.email?.toLowerCase() || null;
}

async function isSuperAdmin(email: string) {
  const db = createServiceRoleSupabaseClient();

  const { data } = await db
    .from("admins")
    .select("role")
    .eq("email", email)
    .single();

  return data?.role === "super_admin";
}

export async function GET() {
  try {
    const email = await getCurrentUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data } = await db
      .from("admins")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const email = await getCurrentUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const allowed = await isSuperAdmin(email);
    if (!allowed) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();

    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("admins")
      .insert({
        email: body.email.toLowerCase(),
        role: body.role || "admin",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const email = await getCurrentUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const allowed = await isSuperAdmin(email);
    if (!allowed) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();

    const db = createServiceRoleSupabaseClient();

    await db.from("admins").delete().eq("email", body.email);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}