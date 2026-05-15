/**
 * GET /api/test-booking/bookings/[id]/receipt
 * Returns a signed download URL for the booking confirmation receipt PDF.
 */

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
    console.error("receipt: auth failed", authErr?.message);
    return NextResponse.json({ error: "Unauthorised — bad token" }, { status: 401 });
  }
  const user = authData.user;
  console.log("receipt: authed as", user.id, user.email);

  // Step 1: load booking (no joins)
  const { data: bk, error: bkErr } = await db
    .from("partner_bookings")
    .select("id, request_id, partner_user_id, job_number, currency, charge_currency, car_hire_price, fuel_price, amount, receipt_storage_path")
    .eq("id", bookingId)
    .maybeSingle();

  console.log("receipt: booking lookup", { bk: !!bk, bkErr: bkErr?.message });

  if (bkErr) return NextResponse.json({ error: "DB error: " + bkErr.message }, { status: 500 });
  if (!bk)   return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Step 2: load customer_request to verify ownership
  const { data: cr, error: crErr } = await db
    .from("customer_requests")
    .select("id, customer_user_id, customer_name, customer_email, pickup_address, dropoff_address, pickup_at, vehicle_category_name")
    .eq("id", bk.request_id)
    .maybeSingle();

  console.log("receipt: request lookup", { cr: !!cr, customer_user_id: cr?.customer_user_id, user_id: user.id, crErr: crErr?.message });

  if (crErr) return NextResponse.json({ error: "DB error: " + crErr.message }, { status: 500 });
  if (!cr)   return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (cr.customer_user_id !== user.id) {
    console.error("receipt: ownership mismatch", { cr_user: cr.customer_user_id, auth_user: user.id });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Step 3: load partner company name
  const { data: profile } = await db
    .from("partner_profiles")
    .select("company_name")
    .eq("user_id", bk.partner_user_id)
    .maybeSingle();

  const storagePath = bk.receipt_storage_path as string | null;

  // If stored, return signed URL
  if (storagePath) {
    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (!signErr && signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl });
    }
    console.warn("receipt: signed URL failed", signErr?.message);
  }

  // Regenerate
  const chargeCurrency = (bk.charge_currency || bk.currency || "EUR").toUpperCase();
  const chargeCarHire  = Number(bk.car_hire_price || 0);
  const chargeFuel     = Number(bk.fuel_price || 0);
  const chargeTotal    = Number(bk.amount || chargeCarHire + chargeFuel);

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
      chargeCurrency,
      chargeCarHire,
      chargeFuel,
      chargeTotal,
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