import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches Stripe fee + exchange rate from the charge's balance transaction.
 * Returns null values gracefully — fee lookup must never block booking creation.
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
    return {
      stripe_fee:          bt.fee != null ? bt.fee / 100 : null,
      stripe_fee_currency: bt.fee_details?.[0]?.currency?.toUpperCase() || null,
      exchange_rate:       bt.exchange_rate ?? null,
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
      const jobNumber      = m.job_number ? Number(m.job_number) : null;
      const chargeId       = typeof pi.latest_charge === "string" ? pi.latest_charge : null;

      // ── Currency split ──────────────────────────────────────────────────────
      // charge_currency = what the customer paid in (used for payments table)
      // bid_currency    = what the partner bid in (used for partner_bookings)
      // All amounts in metadata are in charge_currency (already converted)
      const chargeCurrency = (m.charge_currency || "EUR").toUpperCase();
      const conversionRate = m.conversion_rate ? Number(m.conversion_rate) : 1;

      // Amounts in charge currency (what customer paid)
      const chargeCarHire   = Number(m.car_hire_price   || 0);
      const chargeFuel      = Number(m.fuel_price       || 0);
      const commissionAmt   = Number(m.commission_amount || 0);
      const commissionRate  = Number(m.commission_rate   || 20);
      const partnerNet      = Number(m.partner_net       || 0);
      const chargeTotalPrice = chargeCarHire + chargeFuel;

      // Load bid for bid currency + original bid amounts + notes
      const { data: bid } = await db
        .from("partner_bids")
        .select("currency, notes, car_hire_price, fuel_price, total_price")
        .eq("id", bidId)
        .maybeSingle();

      // partner_bookings stores amounts in BID currency (what partner quoted)
      const bidCurrency    = (bid?.currency || "EUR").toUpperCase();
      const bidCarHire     = Number(bid?.car_hire_price || 0);
      const bidFuel        = Number(bid?.fuel_price     || 0);
      const bidTotalPrice  = Number(bid?.total_price    || bidCarHire + bidFuel);
      const notes          = bid?.notes || null;

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
            // ── Partner-facing amounts — always in bid currency ──
            currency:              bidCurrency,
            amount:                bidTotalPrice,
            car_hire_price:        bidCarHire,
            fuel_price:            bidFuel,
            // ── Charge currency — what customer actually paid ──
            charge_currency:       chargeCurrency,
            conversion_rate:       conversionRate,
            // ── Commission + payout — in charge currency ──
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

      // payments table — always in charge currency (what customer paid)
      await db.from("payments").insert({
        booking_id:               bookingId,
        customer_id:              null,
        stripe_payment_intent_id: pi.id,
        stripe_charge_id:         chargeId,
        amount_total:             chargeTotalPrice,
        amount_car_hire:          chargeCarHire,
        amount_fuel_deposit:      chargeFuel,
        amount_commission:        commissionAmt,
        amount_partner_net:       partnerNet,
        currency:                 chargeCurrency,
        status:                   "succeeded",
        payout_status:            "held",
        stripe_fee:               feeData.stripe_fee,
        stripe_fee_currency:      feeData.stripe_fee_currency,
        exchange_rate:            feeData.exchange_rate ?? (conversionRate !== 1 ? conversionRate : null),
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

      console.log(`payment_intent.succeeded: booking ${bookingId} — bid ${bidCurrency}, charge ${chargeCurrency}, rate ${conversionRate}, fee ${feeData.stripe_fee} ${feeData.stripe_fee_currency}`);
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}