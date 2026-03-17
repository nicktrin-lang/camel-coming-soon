import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const partnerUserId = user.id;
    const db = createServiceRoleSupabaseClient();

    const body = await req.json().catch(() => null);

    const request_id = String(body?.request_id || "").trim();
    const fleet_id = String(body?.fleet_id || "").trim();
    const vehicle_category_slug = String(body?.vehicle_category_slug || "").trim();
    const vehicle_category_name = String(body?.vehicle_category_name || "").trim();
    const car_hire_price = Number(body?.car_hire_price || 0);
    const fuel_price = Number(body?.fuel_price || 0);
    const total_price = Number(body?.total_price || 0);
    const full_insurance_included = !!body?.full_insurance_included;
    const full_tank_included = !!body?.full_tank_included;
    const notes = String(body?.notes || "").trim();

    if (!request_id) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    if (!fleet_id) {
      return NextResponse.json({ error: "Missing fleet_id" }, { status: 400 });
    }

    if (!vehicle_category_slug || !vehicle_category_name) {
      return NextResponse.json(
        { error: "Vehicle category is required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(car_hire_price) || car_hire_price < 0) {
      return NextResponse.json(
        { error: "Car hire price must be valid" },
        { status: 400 }
      );
    }

    if (Number.isNaN(fuel_price) || fuel_price < 0) {
      return NextResponse.json(
        { error: "Fuel price must be valid" },
        { status: 400 }
      );
    }

    if (Number.isNaN(total_price) || total_price < 0) {
      return NextResponse.json(
        { error: "Total price must be valid" },
        { status: 400 }
      );
    }

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select("id, status, expires_at")
      .eq("id", request_id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (requestRow.status !== "open") {
      return NextResponse.json(
        { error: "This request is no longer open for bidding." },
        { status: 400 }
      );
    }

    if (isExpired(requestRow.expires_at)) {
      await db
        .from("customer_requests")
        .update({ status: "expired" })
        .eq("id", request_id)
        .eq("status", "open");

      await db
        .from("request_partner_matches")
        .update({ match_status: "expired" })
        .eq("request_id", request_id)
        .eq("match_status", "open");

      return NextResponse.json(
        { error: "This request has expired." },
        { status: 400 }
      );
    }

    const { data: matchRow, error: matchErr } = await db
      .from("request_partner_matches")
      .select("id, match_status")
      .eq("request_id", request_id)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 400 });
    }

    if (!matchRow) {
      return NextResponse.json(
        { error: "This request is not available for your account." },
        { status: 403 }
      );
    }

    if (matchRow.match_status !== "open") {
      return NextResponse.json(
        { error: "This request is no longer available for bidding." },
        { status: 400 }
      );
    }

    const { data: existingBid, error: existingBidErr } = await db
      .from("partner_bids")
      .select("id")
      .eq("request_id", request_id)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (existingBidErr) {
      return NextResponse.json({ error: existingBidErr.message }, { status: 400 });
    }

    if (existingBid?.id) {
      const { error: updateErr } = await db
        .from("partner_bids")
        .update({
          fleet_id,
          vehicle_category_slug,
          vehicle_category_name,
          car_hire_price,
          fuel_price,
          total_price,
          full_insurance_included,
          full_tank_included,
          notes: notes || null,
          status: "submitted",
        })
        .eq("id", existingBid.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    } else {
      const { error: insertErr } = await db
        .from("partner_bids")
        .insert({
          request_id,
          partner_user_id: partnerUserId,
          fleet_id,
          vehicle_category_slug,
          vehicle_category_name,
          car_hire_price,
          fuel_price,
          total_price,
          full_insurance_included,
          full_tank_included,
          notes: notes || null,
          status: "submitted",
        });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}