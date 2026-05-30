import { NextRequest, NextResponse } from "next/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { generateBookingReceiptPDF } from "@/lib/portal/generateBookingReceiptPDF";

const BUCKET = "booking-receipts";
const SIGNED_URL_EXPIRY = 60;

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorised — no token" }, { status: 401 });

  const db = createCustomerServiceRoleSupabaseClient();

  const { data: authData, error: authErr } = await db.auth.getUser(token);
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Unauthorised — bad token" }, { status: 401 });
  }
  const user = authData.user;

  const { data: bk, error: bkErr } = await db
    .from("partner_bookings")
    .select("id, request_id, partner_user_id, job_number, currency, car_hire_price, fuel_price, amount, receipt_storage_path")
    .eq("id", bookingId)
    .maybeSingle();

  if (bkErr) return NextResponse.json({ error: "DB error: " + bkErr.message }, { status: 500 });
  if (!bk)   return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { data: cr, error: crErr } = await db
    .from("customer_requests")
    .select("id, customer_user_id, customer_name, customer_email, pickup_address, dropoff_address, pickup_at, vehicle_category_name")
    .eq("id", bk.request_id)
    .maybeSingle();

  if (crErr) return NextResponse.json({ error: "DB error: " + crErr.message }, { status: 500 });
  if (!cr)   return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (cr.customer_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profile } = await db
    .from("partner_profiles")
    .select("company_name")
    .eq("user_id", bk.partner_user_id)
    .maybeSingle();

  const storagePath = bk.receipt_storage_path as string | null;

  if (storagePath) {
    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (!signErr && signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl });
    }
  }

  // Always use the booking's own currency — no charge_currency needed
  const currency   = (bk.currency || "EUR").toUpperCase();
  const carHire    = Number(bk.car_hire_price || 0);
  const fuel       = Number(bk.fuel_price || 0);
  const total      = Number(bk.amount || carHire + fuel);

  try {
    const { storagePath: newPath } = await generateBookingReceiptPDF({
      jobNumber:       bk.job_number,
      bookingId:       bk.id,
      requestId:       bk.request_id,
      customerName:    cr.customer_name || null,
      customerEmail:   cr.customer_email || null,
      pickupAddress:   cr.pickup_address || null,
      dropoffAddress:  cr.dropoff_address || null,
      pickupAt:        cr.pickup_at || null,
      vehicleCategory: cr.vehicle_category_name || null,
      companyName:     profile?.company_name || null,
      chargeCurrency:  currency,
      chargeCarHire:   carHire,
      chargeFuel:      fuel,
      chargeTotal:     total,
    });

    const { data: signed } = await db.storage
      .from(BUCKET)
      .createSignedUrl(newPath, SIGNED_URL_EXPIRY);

    if (signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl });
    }

    return NextResponse.json({ error: "Failed to generate receipt URL" }, { status: 500 });
  } catch (e: any) {
    console.error("receipt: regeneration failed", e?.message);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}