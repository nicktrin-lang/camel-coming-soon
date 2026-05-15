/**
 * GET /api/test-booking/bookings/[id]/receipt
 * Returns a signed download URL for the booking confirmation receipt PDF.
 * Uses Bearer token auth — same pattern as all other customer API routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { createClient } from "@supabase/supabase-js";
import { generateBookingReceiptPDF } from "@/lib/portal/generateBookingReceiptPDF";

const BUCKET = "booking-receipts";
const SIGNED_URL_EXPIRY = 60; // seconds

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

  // Auth — Bearer token, same as all other customer routes
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const customerDb = createCustomerServiceRoleSupabaseClient();
  const { data: authData, error: authErr } = await customerDb.auth.getUser(token);
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const user = authData.user;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Load booking + verify it belongs to this customer via customer_requests.customer_user_id
  const { data: bk, error: bkErr } = await db
    .from("partner_bookings")
    .select(`
      id, request_id, partner_user_id, job_number,
      currency, charge_currency, car_hire_price, fuel_price, amount,
      receipt_storage_path,
      customer_requests!inner(
        customer_user_id, customer_name, customer_email,
        pickup_address, dropoff_address, pickup_at, vehicle_category_name
      ),
      partner_profiles!partner_user_id(company_name)
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (bkErr || !bk) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Verify ownership via customer_user_id
  const cr = bk.customer_requests as any;
  if (cr?.customer_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    console.warn("receipt/route: signed URL failed, regenerating", signErr);
  }

  // No stored path or sign failed — regenerate
  const chargeCurrency = (bk.charge_currency || bk.currency || "EUR").toUpperCase();
  const chargeCarHire  = Number(bk.car_hire_price || 0);
  const chargeFuel     = Number(bk.fuel_price || 0);
  const chargeTotal    = Number(bk.amount || chargeCarHire + chargeFuel);
  const profile        = bk.partner_profiles as any;

  try {
    const { storagePath: newPath } = await generateBookingReceiptPDF({
      jobNumber:       bk.job_number,
      bookingId:       bk.id,
      requestId:       bk.request_id,
      customerName:    cr?.customer_name || null,
      customerEmail:   cr?.customer_email || null,
      pickupAddress:   cr?.pickup_address || null,
      dropoffAddress:  cr?.dropoff_address || null,
      pickupAt:        cr?.pickup_at || null,
      vehicleCategory: cr?.vehicle_category_name || null,
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
    console.error("receipt/route: regeneration failed", e?.message);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}