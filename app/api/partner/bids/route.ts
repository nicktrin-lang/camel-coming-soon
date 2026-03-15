import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await safeJson(req);

    const requestId = String(body?.request_id || "").trim();
    const fleetId = body?.fleet_id ? String(body.fleet_id).trim() : null;
    const vehicleCategorySlug = String(body?.vehicle_category_slug || "").trim();
    const vehicleCategoryName = String(body?.vehicle_category_name || "").trim();
    const carHirePrice = Number(body?.car_hire_price || 0);
    const fuelPrice = Number(body?.fuel_price || 0);
    const fullInsuranceIncluded = !!body?.full_insurance_included;
    const fullTankIncluded = !!body?.full_tank_included;
    const notes = String(body?.notes || "").trim();

    if (!requestId) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    if (!vehicleCategorySlug || !vehicleCategoryName) {
      return NextResponse.json(
        { error: "Vehicle category is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(carHirePrice) || carHirePrice < 0) {
      return NextResponse.json(
        { error: "Car hire price must be valid" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fuelPrice) || fuelPrice < 0) {
      return NextResponse.json(
        { error: "Fuel price must be valid" },
        { status: 400 }
      );
    }

    const totalPrice = carHirePrice + fuelPrice;
    const db = createServiceRoleSupabaseClient();
    const partnerUserId = userData.user.id;

    const { data: matchRow, error: matchErr } = await db
      .from("request_partner_matches")
      .select("id, match_status")
      .eq("request_id", requestId)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 400 });
    }

    if (!matchRow) {
      return NextResponse.json(
        { error: "You are not matched to this request" },
        { status: 403 }
      );
    }

    const { data: existingBid } = await db
      .from("partner_bids")
      .select("id")
      .eq("request_id", requestId)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (existingBid?.id) {
      return NextResponse.json(
        { error: "You have already submitted a bid for this request" },
        { status: 400 }
      );
    }

    const { data: bid, error: bidErr } = await db
      .from("partner_bids")
      .insert({
        request_id: requestId,
        partner_user_id: partnerUserId,
        fleet_id: fleetId,
        vehicle_category_slug: vehicleCategorySlug,
        vehicle_category_name: vehicleCategoryName,
        car_hire_price: carHirePrice,
        fuel_price: fuelPrice,
        total_price: totalPrice,
        full_insurance_included: fullInsuranceIncluded,
        full_tank_included: fullTankIncluded,
        notes: notes || null,
        status: "submitted",
      })
      .select("id")
      .single();

    if (bidErr) {
      return NextResponse.json({ error: bidErr.message }, { status: 400 });
    }

    const { error: matchUpdateErr } = await db
      .from("request_partner_matches")
      .update({ match_status: "bid_submitted" })
      .eq("id", matchRow.id);

    if (matchUpdateErr) {
      return NextResponse.json({ error: matchUpdateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, bid_id: bid.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}