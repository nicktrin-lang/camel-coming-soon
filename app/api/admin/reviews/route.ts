import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

async function getAdminUser() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (!email) return null;
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
  if (!adminRow || (adminRow.role !== "admin" && adminRow.role !== "super_admin")) return null;
  return userData.user;
}

// GET — all reviews with partner company name
export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const db = createServiceRoleSupabaseClient();

    const { data: reviews, error } = await db
      .from("partner_reviews")
      .select("id, booking_id, partner_user_id, rating, comment, partner_reply, partner_replied_at, is_visible, created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const partnerIds = [...new Set((reviews || []).map((r: any) => r.partner_user_id).filter(Boolean))];
    const bookingIds = (reviews || []).map((r: any) => r.booking_id).filter(Boolean);

    let profileMap = new Map<string, string>();
    if (partnerIds.length > 0) {
      const { data: profiles } = await db.from("partner_profiles").select("user_id, company_name").in("user_id", partnerIds);
      profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.company_name]));
    }

    let jobMap = new Map<string, number | null>();
    if (bookingIds.length > 0) {
      const { data: bookings } = await db.from("partner_bookings").select("id, job_number").in("id", bookingIds);
      jobMap = new Map((bookings || []).map((b: any) => [b.id, b.job_number]));
    }

    const data = (reviews || []).map((r: any) => ({
      ...r,
      partner_company_name: profileMap.get(r.partner_user_id) || "—",
      job_number: jobMap.get(r.booking_id) ?? null,
    }));

    return NextResponse.json({ reviews: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// PATCH — toggle visibility
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const reviewId  = String(body?.review_id || "").trim();
    const isVisible = !!body?.is_visible;

    if (!reviewId) return NextResponse.json({ error: "Missing review_id" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();
    const { error } = await db.from("partner_reviews").update({ is_visible: isVisible }).eq("id", reviewId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}