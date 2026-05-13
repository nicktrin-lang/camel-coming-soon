import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { calculateCommission } from "@/lib/portal/calculateCommission";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    // Verify customer
    const customerDb = createCustomerServiceRoleSupabaseClient();
    const { data: userData, error: userErr } = await customerDb.auth.getUser(accessToken);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const customerUser = userData.user;

    const body = await req.json().catch(() => null);
    const bidId = String(body?.bid_id || "").trim();
    if (!bidId) return NextResponse.json({ error: "Missing bid_id" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();

    // Load bid
    const { data: bid } = await db
      .from("partner_bids")
      .select("*")
      .eq("id", bidId)
      .maybeSingle();

    if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

    // Verify request belongs to customer and is still open
    const { data: request } = await db
      .from("customer_requests")
      .select("id, status, expires_at, job_number")
      .eq("id", bid.request_id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "open") return NextResponse.json({ error: "This request is no longer open." }, { status: 400 });
    if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This request has expired." }, { status: 400 });
    }

    // Get partner's Stripe account
    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, commission_rate")
      .eq("user_id", bid.partner_user_id)
      .maybeSingle();

    if (!partnerProfile?.stripe_account_id || !partnerProfile?.stripe_onboarding_complete) {
      return NextResponse.json({ error: "This partner has not set up payouts yet. Please choose another bid." }, { status: 400 });
    }

    // Get platform commission settings
    const { data: platform } = await db
      .from("platform_settings")
      .select("default_commission_rate, minimum_commission_amount")
      .limit(1)
      .maybeSingle();

    const commissionRatePct = partnerProfile.commission_rate ?? platform?.default_commission_rate ?? 20;
    const minimumCommission = platform?.minimum_commission_amount ?? 10;

    const carHirePrice = Number(bid.car_hire_price || 0);
    const fuelPrice    = Number(bid.fuel_price || 0);
    const totalPrice   = Number(bid.total_price || 0);
    const currency     = String(bid.currency || "EUR").toLowerCase();

    const { commissionAmount, partnerPayoutAmount } = calculateCommission(
      carHirePrice,
      commissionRatePct,
      minimumCommission
    );

    // Stripe works in smallest currency unit (cents)
    const totalCents      = Math.round(totalPrice * 100);
    const commissionCents = Math.round(commissionAmount * 100);
    const partnerCents    = totalCents - commissionCents;

    // Create PaymentIntent with destination charge
    // Funds split: commissionCents stays with Camel, partnerCents transferred to partner
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalCents,
      currency: currency,
      transfer_data: {
        destination: partnerProfile.stripe_account_id,
        amount: partnerCents, // partner receives this after Stripe fees
      },
      metadata: {
        bid_id:             bidId,
        request_id:         bid.request_id,
        customer_user_id:   customerUser.id,
        partner_user_id:    bid.partner_user_id,
        car_hire_price:     carHirePrice.toString(),
        fuel_price:         fuelPrice.toString(),
        commission_amount:  commissionAmount.toString(),
        commission_rate:    commissionRatePct.toString(),
        partner_net:        partnerPayoutAmount.toString(),
        job_number:         String(request.job_number || ""),
      },
      // Hold funds — partner payout is manual (monthly batch)
      capture_method: "automatic",
    });

    return NextResponse.json({
      client_secret:     paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_total:      totalPrice,
      amount_car_hire:   carHirePrice,
      amount_fuel:       fuelPrice,
      commission:        commissionAmount,
      currency:          bid.currency,
      partner_name:      bid.partner_company_name || "Car Hire Company",
    });
  } catch (e: any) {
    console.error("create-intent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}