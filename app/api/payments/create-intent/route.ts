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

function fmtAmt(n: number, currency: string): string {
  return `${currency} ${n.toFixed(2)}`;
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
    const chargeCurrency = normalizeCurrency(request.currency);
    const bidCurrency    = normalizeCurrency(bid.currency);

    const bidCarHire = Number(bid.car_hire_price || 0);
    const bidFuel    = Number(bid.fuel_price || 0);

    let carHirePrice: number;
    let fuelPrice: number;
    let conversionRate: number = 1;

    if (chargeCurrency === bidCurrency) {
      carHirePrice   = bidCarHire;
      fuelPrice      = bidFuel;
      conversionRate = 1;
    } else {
      const { convertedAmount: convertedCarHire, rate } = await convertCurrency(bidCarHire, bidCurrency, chargeCurrency);
      const { convertedAmount: convertedFuel }          = await convertCurrency(bidFuel, bidCurrency, chargeCurrency);
      carHirePrice   = convertedCarHire;
      fuelPrice      = convertedFuel;
      conversionRate = rate;
    }

    const totalPrice = Math.round((carHirePrice + fuelPrice) * 100) / 100;

    // ── Commission ────────────────────────────────────────────────────────────
    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, commission_rate, company_name")
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
    const jobLabel    = request.job_number ? `#${request.job_number}` : bidId.slice(0, 8);
    const partnerName = partnerProfile.company_name || bid.partner_company_name || "Partner";

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalCents,
      currency: chargeCurrency.toLowerCase(),
      description: `Camel Global ${jobLabel} | ${partnerName} | Car hire ${fmtAmt(carHirePrice, chargeCurrency)} + Fuel deposit ${fmtAmt(fuelPrice, chargeCurrency)} | Commission ${fmtAmt(commissionAmount, chargeCurrency)} | Partner net ${fmtAmt(partnerPayoutAmount + fuelPrice, chargeCurrency)}`,
      transfer_data: {
        destination: partnerProfile.stripe_account_id,
        amount: partnerCents,
      },
      metadata: {
        job_number:        String(request.job_number || ""),
        partner_name:      partnerName,
        // Formatted amounts for Stripe dashboard readability
        car_hire:          fmtAmt(carHirePrice, chargeCurrency),
        fuel_deposit:      fmtAmt(fuelPrice, chargeCurrency),
        total_charged:     fmtAmt(totalPrice, chargeCurrency),
        camel_commission:  fmtAmt(commissionAmount, chargeCurrency),
        commission_rate:   `${commissionRatePct}%`,
        partner_net:       fmtAmt(partnerPayoutAmount + fuelPrice, chargeCurrency),
        // Raw numeric values for webhook reconciliation
        car_hire_price:    carHirePrice.toString(),
        fuel_price:        fuelPrice.toString(),
        commission_amount: commissionAmount.toString(),
        conversion_rate:   conversionRate.toString(),
        charge_currency:   chargeCurrency,
        bid_currency:      bidCurrency,
        // IDs for lookup
        bid_id:            bidId,
        request_id:        bid.request_id,
        customer_user_id:  customerUser.id,
        partner_user_id:   bid.partner_user_id,
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
      currency:          chargeCurrency,
      partner_name:      partnerName,
    });
  } catch (e: any) {
    console.error("create-intent error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}