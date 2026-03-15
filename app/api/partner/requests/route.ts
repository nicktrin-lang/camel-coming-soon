import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const userId = userData.user.id;
    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("request_partner_matches")
      .select(`
        id,
        match_status,
        matched_fleet_id,
        created_at,
        customer_requests (
          id,
          pickup_address,
          dropoff_address,
          pickup_at,
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
      .eq("partner_user_id", userId)
      .order("created_at", { ascending: false });

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