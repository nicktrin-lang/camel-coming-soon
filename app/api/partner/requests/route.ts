import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

function normalizePartnerRequestStatus(params: {
  requestStatus?: string | null;
  expiresAt?: string | null;
  myBidStatus?: string | null;
  hasBooking?: boolean;
}) {
  const requestStatus = String(params.requestStatus || "").trim();
  const expiresAt = params.expiresAt || null;
  const myBidStatus = String(params.myBidStatus || "").trim();
  const hasBooking = !!params.hasBooking;

  const expired =
    !!expiresAt && new Date(expiresAt).getTime() <= Date.now();

  if (hasBooking || myBidStatus === "accepted") {
    return "bid_successful";
  }

  if (myBidStatus === "unsuccessful" || myBidStatus === "rejected") {
    return "bid_unsuccessful";
  }

  if (expired || requestStatus === "expired") {
    return "expired";
  }

  if (myBidStatus === "submitted") {
    return "bid_submitted";
  }

  return "open";
}

export async function GET() {
  try {
    const { user, role, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const adminMode = isAdminRole(role);
    const db = createServiceRoleSupabaseClient();

    let requestRows: any[] = [];

    if (adminMode) {
      const { data, error } = await db
        .from("customer_requests")
        .select(`
          id,
          job_number,
          pickup_address,
          dropoff_address,
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
        `)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      requestRows = data || [];

      const dataOut = requestRows.map((row: any) => ({
        id: row.id,
        job_number: row.job_number ?? null,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        pickup_at: row.pickup_at,
        dropoff_at: row.dropoff_at,
        journey_duration_minutes: row.journey_duration_minutes,
        passengers: row.passengers,
        suitcases: row.suitcases,
        hand_luggage: row.hand_luggage,
        vehicle_category_slug: row.vehicle_category_slug,
        vehicle_category_name: row.vehicle_category_name,
        notes: row.notes,
        request_status: row.status,
        status: row.status,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));

      return NextResponse.json(
        { data: dataOut, role, adminMode: true },
        { status: 200 }
      );
    }

    const { data: matchRows, error: matchErr } = await db
      .from("request_partner_matches")
      .select("request_id")
      .eq("partner_user_id", userId);

    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 400 });
    }

    const requestIds = Array.from(
      new Set(
        (matchRows || [])
          .map((row: any) => String(row.request_id || ""))
          .filter(Boolean)
      )
    );

    if (requestIds.length === 0) {
      return NextResponse.json({ data: [], role, adminMode: false }, { status: 200 });
    }

    const { data: requestData, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id,
        job_number,
        pickup_address,
        dropoff_address,
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
      `)
      .in("id", requestIds)
      .order("created_at", { ascending: false });

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    requestRows = requestData || [];
    const ids = requestRows.map((row: any) => String(row.id));

    const { data: myBids, error: bidsErr } = await db
      .from("partner_bids")
      .select("id, request_id, status, created_at")
      .eq("partner_user_id", userId)
      .in("request_id", ids);

    if (bidsErr) {
      return NextResponse.json({ error: bidsErr.message }, { status: 400 });
    }

    const { data: myBookings, error: bookingsErr } = await db
      .from("partner_bookings")
      .select("id, request_id, booking_status")
      .eq("partner_user_id", userId)
      .in("request_id", ids);

    if (bookingsErr) {
      return NextResponse.json({ error: bookingsErr.message }, { status: 400 });
    }

    const myBidMap = new Map(
      (myBids || []).map((bid: any) => [String(bid.request_id), bid])
    );

    const myBookingMap = new Map(
      (myBookings || []).map((booking: any) => [String(booking.request_id), booking])
    );

    const dataOut = requestRows.map((row: any) => {
      const requestId = String(row.id);
      const myBid = myBidMap.get(requestId) || null;
      const myBooking = myBookingMap.get(requestId) || null;

      const partnerStatus = normalizePartnerRequestStatus({
        requestStatus: row.status,
        expiresAt: row.expires_at,
        myBidStatus: myBid?.status || null,
        hasBooking: !!myBooking,
      });

      return {
        id: row.id,
        job_number: row.job_number ?? null,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        pickup_at: row.pickup_at,
        dropoff_at: row.dropoff_at,
        journey_duration_minutes: row.journey_duration_minutes,
        passengers: row.passengers,
        suitcases: row.suitcases,
        hand_luggage: row.hand_luggage,
        vehicle_category_slug: row.vehicle_category_slug,
        vehicle_category_name: row.vehicle_category_name,
        notes: row.notes,
        request_status: row.status,
        status: partnerStatus,
        created_at: row.created_at,
        expires_at: row.expires_at,
      };
    });

    return NextResponse.json(
      { data: dataOut, role, adminMode: false },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}