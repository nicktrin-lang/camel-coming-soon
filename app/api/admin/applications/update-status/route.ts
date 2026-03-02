import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getAdminEmails() {
  const raw = process.env.CAMEL_ADMIN_EMAILS || process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").toLowerCase();
    const id = body?.id;
    const status = String(body?.status || "").toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Missing admin email" }, { status: 400 });
    }

    const admins = getAdminEmails();
    if (!admins.includes(email)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    if (!["approved", "denied", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("partner_applications")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}