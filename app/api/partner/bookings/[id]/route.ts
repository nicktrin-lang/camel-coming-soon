import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const userId = userData.user.id;
    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("partner_bookings")
      .select(
        `
        id,
        booking_status,
        amount,
        notes,
        driver_name,
        driver_phone,
        vehicle_plate,
        vehicle_model,
        created_at,
        request_id,
        winning_bid_id,
        customer_requests (
          pickup_address,
          dropoff_address,
          pickup_at,
          dropoff_at,
          journey_duration_minutes,
          passengers,
          suitcases,
          hand_luggage,
          vehicle_category_name,
          notes
        )
      `
      )
      .eq("id", id)
      .eq("partner_user_id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const userId = userData.user.id;
    const body = await req.json().catch(() => null);

    const driver_name = String(body?.driver_name || "").trim();
    const driver_phone = String(body?.driver_phone || "").trim();
    const vehicle_plate = String(body?.vehicle_plate || "").trim();
    const vehicle_model = String(body?.vehicle_model || "").trim();

    const db = createServiceRoleSupabaseClient();

    const { data: existing, error: existingErr } = await db
      .from("partner_bookings")
      .select("id")
      .eq("id", id)
      .eq("partner_user_id", userId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 400 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const nextStatus =
      driver_name || driver_phone || vehicle_plate || vehicle_model
        ? "driver_assigned"
        : undefined;

    const updatePayload: Record<string, any> = {
      driver_name: driver_name || null,
      driver_phone: driver_phone || null,
      vehicle_plate: vehicle_plate || null,
      vehicle_model: vehicle_model || null,
    };

    if (nextStatus) {
      updatePayload.booking_status = nextStatus;
    }

    const { error } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id)
      .eq("partner_user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}