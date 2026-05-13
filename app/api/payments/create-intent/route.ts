import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { calculateCommission } from "@/lib/portal/calculateCommission";
import { convertCurrency, type Currency } from "@/lib/serverCurrency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

function normalizeCurrency(v: unknown): Currency {
  const s = String(v || "").toUpperCase().trim();
  if (s === "GBP" || s === "USD") return s;
  return "EUR";
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

    // Load request — need customer's chosen currency
    const { data: request } = await db
      .from("customer_requests")
      .select("id, status, expires_at, job_number, currency")
      .eq("id", bid.request_id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "open") return NextResponse.json({ error: "This request is no longer open." }, { status: 400 });
    if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This request has expired." }, { status: 400 });
    }

    // ── Currency resolution ───────────────────────────────────────────────────
    // Customer pays in their chosen currency (request.currency).
    // Partner bid is in bid.currency — convert if different.
    const chargeCurrency = normalizeCurrency(request.currency); // what customer pays in
    const bidCurrency    = normalizeCurrency(bid.currency);     // what partner bid in

    const bidCarHire = Number(bid.car_hire_price || 0);
    const bidFuel    = Number(bid.fuel_price || 0);

    let carHirePrice: number;
    let fuelPrice: number;
    let conversionRate: number = 1;

    if (chargeCurrency === bidCurrency) {
      // No conversion needed
      carHirePrice = bidCarHire;
      fuelPrice    = bidFuel;
      conversionRate = 1;
    } else {
      // Convert bid amounts to customer's currency
      const { convertedAmount: convertedCarHire, rate } = await convertCurrency(bidCarHire, bidCurrency, chargeCurrency);
      const { convertedAmount: convertedFuel }          = await convertCurrency(bidFuel, bidCurrency, chargeCurrency);
      carHirePrice   = convertedCarHire;
      fuelPrice      = convertedFuel;
      conversionRate = rate;
    }

    const totalPrice = Math.round((carHirePrice + fuelPrice) * 100) / 100;

    // ── Commission ────────────────────────────────────────────────────────────
    // Calculated on converted car hire price (in charge currency)
    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, commission_rate")
      .eq("user_id", bid.partner_user_id)
      .maybeSingle();

    if (!partnerProfile?.stripe_account_id || !partnerProfile?.stripe_onboarding_complete) {
      return NextResponse.json({ error: "This partner has not set up payouts yet. Please choose another bid." }, { status: 400 });
    }

    const { data: platform } = await db
      .from("platform_settings")
      .select("default_commission_rate, minimum_commission_amount")
      .limit(1)
      .maybeSingle();

    const commissionRatePct = partnerProfile.commission_rate ?? platform?.default_commission_rate ?? 20;
    const minimumCommission = platform?.minimum_commission_amount ?? 10;

    // minimum_commission is in EUR — convert to charge currency if needed
    const { convertedAmount: minCommissionConverted } = await convertCurrency(
      minimumCommission,
      "EUR",
      chargeCurrency
    );

    const { commissionAmount, partnerPayoutAmount } = calculateCommission(
      carHirePrice,
      commissionRatePct,
      minCommissionConverted
    );

    // ── Stripe amounts (smallest unit) ────────────────────────────────────────
    const totalCents      = Math.round(totalPrice * 100);
    const commissionCents = Math.round(commissionAmount * 100);
    const partnerCents    = totalCents - commissionCents;

    // ── Create PaymentIntent ──────────────────────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalCents,
      currency: chargeCurrency.toLowerCase(),
      transfer_data: {
        destination: partnerProfile.stripe_account_id,
        amount: partnerCents,
      },
      metadata: {
        bid_id:            bidId,
        request_id:        bid.request_id,
        customer_user_id:  customerUser.id,
        partner_user_id:   bid.partner_user_id,
        // Amounts in charge currency
        car_hire_price:    carHirePrice.toString(),
        fuel_price:        fuelPrice.toString(),
        commission_amount: commissionAmount.toString(),
        commission_rate:   commissionRatePct.toString(),
        partner_net:       partnerPayoutAmount.toString(),
        job_number:        String(request.job_number || ""),
        // Conversion info for webhook
        charge_currency:   chargeCurrency,
        bid_currency:      bidCurrency,
        conversion_rate:   conversionRate.toString(),
      },
      capture_method: "automatic",
    });

    return NextResponse.json({
      client_secret:     paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_total:      totalPrice,
      amount_car_hire:   carHirePrice,
      amount_fuel:       fuelPrice,
      commission:        commissionAmount,
      currency:          chargeCurrency, // customer always sees their currency
      partner_name:      bid.partner_company_name || "Car Hire Company",
    });
  } catch (e: any) {
    console.error("create-intent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}