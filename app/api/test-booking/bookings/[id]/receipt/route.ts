/**
 * GET /api/test-booking/bookings/[id]/receipt
 * Returns a signed download URL for the booking confirmation receipt PDF.
 * If the PDF doesn't exist yet (edge case), regenerates it.
 */

import { NextRequest, NextResponse } from "next/server";
import { createCustomerServerClient } from "@/lib/supabase-customer/server";
import { createClient } from "@supabase/supabase-js";
import { generateBookingReceiptPDF } from "@/lib/portal/generateBookingReceiptPDF";

const BUCKET = "booking-receipts";
const SIGNED_URL_EXPIRY = 60; // seconds

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  // Auth check
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Load booking — verify it belongs to this customer's request
  const { data: bk, error: bkErr } = await db
    .from("partner_bookings")
    .select(`
      id, request_id, partner_user_id, job_number,
      currency, charge_currency, car_hire_price, fuel_price, amount,
      receipt_storage_path,
      customer_requests!inner(
        customer_email, customer_name, pickup_address, dropoff_address,
        pickup_at, vehicle_category_name
      ),
      partner_profiles!partner_user_id(company_name)
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (bkErr || !bk) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Verify the customer owns this request
  const req2 = bk.customer_requests as any;
  if (req2?.customer_email?.toLowerCase() !== user.email?.toLowerCase()) {
    // Also allow lookup by user_id on customer_requests if available
    const { data: cr } = await db
      .from("customer_requests")
      .select("id")
      .eq("id", bk.request_id)
      .eq("customer_id", user.id)
      .maybeSingle();
    if (!cr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const storagePath = bk.receipt_storage_path as string | null;

  // If we have a stored path, return signed URL
  if (storagePath) {
    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (!signErr && signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl });
    }
    // Fall through to regenerate if signed URL failed
    console.warn("receipt/route: signed URL failed, regenerating", signErr);
  }

  // No stored path or sign failed — regenerate
  const chargeCurrency = (bk.charge_currency || bk.currency || "EUR").toUpperCase();
  const chargeCarHire  = Number(bk.car_hire_price || 0);
  const chargeFuel     = Number(bk.fuel_price || 0);
  const chargeTotal    = Number(bk.amount || chargeCarHire + chargeFuel);
  const profile        = bk.partner_profiles as any;

  try {
    const { storagePath: newPath, base64 } = await generateBookingReceiptPDF({
      jobNumber:       bk.job_number,
      bookingId:       bk.id,
      requestId:       bk.request_id,
      customerName:    req2?.customer_name || null,
      customerEmail:   req2?.customer_email || null,
      pickupAddress:   req2?.pickup_address || null,
      dropoffAddress:  req2?.dropoff_address || null,
      pickupAt:        req2?.pickup_at || null,
      vehicleCategory: req2?.vehicle_category_name || null,
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

    // Last resort — return base64 data URL
    return NextResponse.json({
      url: `data:application/pdf;base64,${base64}`,
      isDataUrl: true,
    });
  } catch (e: any) {
    console.error("receipt/route: regeneration failed", e?.message);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}