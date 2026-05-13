import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { calculateCommission } from "@/lib/portal/calculateCommission";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches Stripe fee + exchange rate from the charge's balance transaction.
 * Returns null values gracefully if anything fails — we never want fee lookup
 * to block booking creation.
 */
async function getStripeFeeData(chargeId: string | null): Promise<{
  stripe_fee: number | null;
  stripe_fee_currency: string | null;
  exchange_rate: number | null;
}> {
  const empty = { stripe_fee: null, stripe_fee_currency: null, exchange_rate: null };
  if (!chargeId) return empty;

  try {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["balance_transaction"],
    });

    const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
    if (!bt || typeof bt === "string") return empty;

    // fee is in smallest currency unit (cents) — convert to major unit
    const fee = bt.fee != null ? bt.fee / 100 : null;
    const feeCurrency = bt.fee_details?.[0]?.currency?.toUpperCase() || null;
    const exchangeRate = bt.exchange_rate ?? null;

    return {
      stripe_fee: fee,
      stripe_fee_currency: feeCurrency,
      exchange_rate: exchangeRate,
    };
  } catch (e: any) {
    console.error("getStripeFeeData error:", e?.message);
    return empty;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m  = pi.metadata;

      const bidId          = m.bid_id;
      const requestId      = m.request_id;
      const partnerUserId  = m.partner_user_id;
      const carHirePrice   = Number(m.car_hire_price   || 0);
      const fuelPrice      = Number(m.fuel_price       || 0);
      const commissionAmt  = Number(m.commission_amount || 0);
      const commissionRate = Number(m.commission_rate   || 20);
      const partnerNet     = Number(m.partner_net       || 0);
      const jobNumber      = m.job_number ? Number(m.job_number) : null;
      const totalPrice     = carHirePrice + fuelPrice;

      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;

      // Load bid for currency + notes
      const { data: bid } = await db
        .from("partner_bids")
        .select("currency, notes, total_price")
        .eq("id", bidId)
        .maybeSingle();

      const currency = bid?.currency || "EUR";
      const notes    = bid?.notes    || null;

      // Check request still open
      const { data: request } = await db
        .from("customer_requests")
        .select("status")
        .eq("id", requestId)
        .maybeSingle();

      if (request?.status !== "open") {
        console.log(`Payment succeeded but request ${requestId} is ${request?.status} — skipping`);
        return NextResponse.json({ received: true });
      }

      // Mark bid accepted, others unsuccessful
      await db.from("partner_bids").update({ status: "accepted" }).eq("id", bidId);
      await db.from("partner_bids").update({ status: "unsuccessful" }).eq("request_id", requestId).neq("id", bidId);
      await db.from("customer_requests").update({ status: "confirmed" }).eq("id", requestId);
      await db.from("request_partner_matches").update({ match_status: "accepted" }).eq("request_id", requestId).eq("partner_user_id", partnerUserId);
      await db.from("request_partner_matches").update({ match_status: "closed" }).eq("request_id", requestId).neq("partner_user_id", partnerUserId);

      // Check booking doesn't already exist
      const { data: existing } = await db
        .from("partner_bookings")
        .select("id")
        .eq("winning_bid_id", bidId)
        .maybeSingle();

      let bookingId = existing?.id;

      if (!bookingId) {
        const { data: inserted, error: bookingErr } = await db
          .from("partner_bookings")
          .insert({
            request_id:            requestId,
            winning_bid_id:        bidId,
            partner_user_id:       partnerUserId,
            booking_status:        "confirmed",
            amount:                totalPrice,
            currency:              currency,
            car_hire_price:        carHirePrice,
            fuel_price:            fuelPrice,
            commission_rate:       commissionRate,
            commission_amount:     commissionAmt,
            partner_payout_amount: partnerNet,
            notes:                 notes,
            job_number:            jobNumber,
            payout_status:         "held",
          })
          .select("id")
          .single();

        if (bookingErr) {
          console.error("Booking insert error:", bookingErr);
          return NextResponse.json({ error: bookingErr.message }, { status: 500 });
        }
        bookingId = inserted.id;
      }

      // Fetch Stripe fee + exchange rate from balance transaction
      const feeData = await getStripeFeeData(chargeId);

      // Record payment — includes fee data
      await db.from("payments").insert({
        booking_id:               bookingId,
        customer_id:              null,
        stripe_payment_intent_id: pi.id,
        stripe_charge_id:         chargeId,
        amount_total:             totalPrice,
        amount_car_hire:          carHirePrice,
        amount_fuel_deposit:      fuelPrice,
        amount_commission:        commissionAmt,
        amount_partner_net:       partnerNet,
        currency:                 currency.toUpperCase(),
        status:                   "succeeded",
        payout_status:            "held",
        stripe_fee:               feeData.stripe_fee,
        stripe_fee_currency:      feeData.stripe_fee_currency,
        exchange_rate:            feeData.exchange_rate,
      });

      // Update booking with payment_id
      const { data: payment } = await db
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (payment?.id) {
        await db.from("partner_bookings").update({ payment_id: payment.id }).eq("id", bookingId);
      }

      // Sync booking statuses
      await syncBookingStatuses(bookingId);

      console.log(`payment_intent.succeeded: booking ${bookingId}, fee ${feeData.stripe_fee} ${feeData.stripe_fee_currency}, rate ${feeData.exchange_rate}`);
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}