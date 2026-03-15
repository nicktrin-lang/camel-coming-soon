import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const partnerUserId = userData.user.id;
    const db = createServiceRoleSupabaseClient();

    const { data: matchRows, error: matchErr } = await db
      .from("request_partner_matches")
      .select(`
        id,
        request_id,
        match_status,
        matched_fleet_id,
        created_at,
        customer_requests!inner (
          id,
          customer_name,
          customer_email,
          customer_phone,
          pickup_address,
          pickup_lat,
          pickup_lng,
          dropoff_address,
          dropoff_lat,
          dropoff_lng,
          pickup_at,
          dropoff_at,
          journey_duration_minutes,
          passengers,
          suitcases,
          hand_luggage,
          vehicle_category_slug,
          vehicle_category_name,
          notes,
          status,
          created_at,
          expires_at
        )
      `)
      .eq("partner_user_id", partnerUserId)
      .eq("request_id", id)
      .limit(1);

    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 400 });
    }

    const matchRow = matchRows?.[0];

    if (!matchRow) {
      return NextResponse.json(
        { error: "Request not found for this partner" },
        { status: 404 }
      );
    }

    const { data: fleetRows, error: fleetErr } = await db
      .from("partner_fleet")
      .select(
        "id, category_slug, category_name, max_passengers, max_suitcases, max_hand_luggage, service_level, is_active"
      )
      .eq("user_id", partnerUserId)
      .eq("is_active", true)
      .order("category_name", { ascending: true });

    if (fleetErr) {
      return NextResponse.json({ error: fleetErr.message }, { status: 400 });
    }

    const { data: existingBid, error: bidErr } = await db
      .from("partner_bids")
      .select(
        "id, vehicle_category_name, car_hire_price, fuel_price, total_price, full_insurance_included, full_tank_included, notes, status, created_at"
      )
      .eq("request_id", id)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (bidErr) {
      return NextResponse.json({ error: bidErr.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        match: matchRow,
        fleet: fleetRows || [],
        bid: existingBid || null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}