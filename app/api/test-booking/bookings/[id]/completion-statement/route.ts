import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { generateCompletionStatementPDF } from "@/lib/portal/generateCompletionStatementPDF";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;
  const customerSupabase = createCustomerServiceRoleSupabaseClient();
  const { data, error } = await customerSupabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken  = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { id: bookingId } = await params;
    const db = createServiceRoleSupabaseClient();

    // Load booking — verify it belongs to this customer via request
    const { data: booking, error: bkErr } = await db
      .from("partner_bookings")
      .select(`
        id, job_number, booking_status, request_id, partner_user_id,
        currency, charge_currency, car_hire_price, fuel_price, amount,
        fuel_used_quarters, fuel_charge, fuel_refund,
        collection_fuel_level_partner, collection_fuel_level_driver,
        return_fuel_level_partner, return_fuel_level_driver
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.booking_status !== "completed") {
      return NextResponse.json({ error: "Completion statement only available for completed bookings" }, { status: 400 });
    }

    // Load request — verify customer ownership
    const { data: request, error: reqErr } = await db
      .from("customer_requests")
      .select("id, customer_user_id, pickup_address, dropoff_address, pickup_at, vehicle_category_name")
      .eq("id", booking.request_id)
      .maybeSingle();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.customer_user_id !== customerUser.id) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }

    // Load partner company name
    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const currency = (booking.charge_currency || booking.currency || "EUR") as string;

    const collectionFuel =
      booking.collection_fuel_level_partner || booking.collection_fuel_level_driver || null;
    const returnFuel =
      booking.return_fuel_level_partner || booking.return_fuel_level_driver || null;

    // Generate PDF
    const pdfBuffer = await generateCompletionStatementPDF({
      jobNumber:       booking.job_number,
      bookingId,
      customerName:    null, // not needed on customer-facing download
      pickupAddress:   request.pickup_address || null,
      dropoffAddress:  request.dropoff_address || null,
      pickupAt:        request.pickup_at || null,
      vehicleCategory: request.vehicle_category_name || null,
      companyName:     partnerProfile?.company_name || null,
      currency,
      carHire:         Number(booking.car_hire_price || 0),
      fuelDeposit:     Number(booking.fuel_price || 0),
      totalPaid:       Number(booking.amount || 0),
      collectionFuel,
      returnFuel,
      usedQuarters:    booking.fuel_used_quarters ?? 0,
      fuelCharge:      Number(booking.fuel_charge || 0),
      fuelRefund:      Number(booking.fuel_refund || 0),
      issuedAt:        new Date().toISOString(),
    });

    const filename = `Camel-Completion-Statement-${booking.job_number ?? bookingId.slice(0, 8)}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(pdfBuffer.length),
      },
    });
  } catch (e: any) {
    console.error("Completion statement route error:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}