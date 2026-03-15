import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function getAdminEmails() {
  return String(process.env.CAMEL_ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).toLowerCase());
}

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const user = userData.user;
    const userId = user.id;
    const adminMode = isAdminEmail(user.email);

    const db = createServiceRoleSupabaseClient();

    let query = db
      .from("partner_bookings")
      .select(`
        id,
        request_id,
        partner_user_id,
        winning_bid_id,
        booking_status,
        amount,
        notes,
        created_at,
        job_number,
        customer_requests (
          pickup_address,
          dropoff_address,
          pickup_at,
          dropoff_at,
          journey_duration_minutes,
          passengers,
          suitcases,
          hand_luggage,
          vehicle_category_name
        )
      `)
      .order("created_at", { ascending: false });

    if (!adminMode) {
      query = query.eq("partner_user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}