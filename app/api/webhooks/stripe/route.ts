import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";
import { sendEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getStripeFeeData(chargeId: string | null): Promise<{
  stripe_fee: number | null;
  stripe_fee_currency: string | null;
  exchange_rate: number | null;
}> {
  const empty = { stripe_fee: null, stripe_fee_currency: null, exchange_rate: null };
  if (!chargeId) return empty;
  try {
    const charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
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

      const bidId         = m.bid_id;
      const requestId     = m.request_id;
      const partnerUserId = m.partner_user_id;
      const jobNumber     = m.job_number ? Number(m.job_number) : null;
      const chargeId      = typeof pi.latest_charge === "string" ? pi.latest_charge : null;

      const chargeCurrency  = (m.charge_currency || "EUR").toUpperCase();
      const conversionRate  = m.conversion_rate ? Number(m.conversion_rate) : 1;
      const chargeCarHire   = Number(m.car_hire_price    || 0);
      const chargeFuel      = Number(m.fuel_price        || 0);
      const commissionAmt   = Number(m.commission_amount || 0);
      const commissionRate  = Number(m.commission_rate   || 20);
      const partnerNet      = Number(m.partner_net       || 0);
      const chargeTotalPrice = chargeCarHire + chargeFuel;

      // Load bid for bid currency + original amounts + notes
      const { data: bid } = await db
        .from("partner_bids")
        .select("currency, notes, car_hire_price, fuel_price, total_price")
        .eq("id", bidId)
        .maybeSingle();

      const bidCurrency   = (bid?.currency || "EUR").toUpperCase();
      const bidCarHire    = Number(bid?.car_hire_price || 0);
      const bidFuel       = Number(bid?.fuel_price     || 0);
      const bidTotalPrice = Number(bid?.total_price    || bidCarHire + bidFuel);
      const notes         = bid?.notes || null;

      // Load request for customer info + pickup details
      const { data: request } = await db
        .from("customer_requests")
        .select("status, customer_name, customer_email, pickup_address, dropoff_address, pickup_at")
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
            currency:              bidCurrency,
            amount:                bidTotalPrice,
            car_hire_price:        bidCarHire,
            fuel_price:            bidFuel,
            charge_currency:       chargeCurrency,
            conversion_rate:       conversionRate,
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

      // Stripe fee data
      const feeData = await getStripeFeeData(chargeId);

      // Insert payment record
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

      // Link payment_id back to booking
      const { data: payment } = await db
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (payment?.id) {
        await db.from("partner_bookings").update({ payment_id: payment.id }).eq("id", bookingId);
      }

      await syncBookingStatuses(bookingId);

      // ── Load partner profile for emails ─────────────────────────────────
      const { data: partnerProfile } = await db
        .from("partner_profiles")
        .select("company_name, contact_name")
        .eq("user_id", partnerUserId)
        .maybeSingle();

      const { data: partnerAuthData } = await db.auth.admin.getUserById(partnerUserId);
      const partnerEmail = partnerAuthData?.user?.email || null;

      const jobNo       = jobNumber ? `#${jobNumber}` : "";
      const companyName = partnerProfile?.company_name || "your car hire partner";
      const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
      const portalUrl   = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.camel-global.com";
      const fmtCharge   = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: chargeCurrency }).format(n);
      const fmtBid      = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: bidCurrency }).format(n);
      const pickupTime  = request?.pickup_at
        ? new Date(request.pickup_at).toLocaleString("en-GB", { timeZone: "Europe/Madrid" })
        : "—";
      const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

      // ── Email customer — booking confirmed ───────────────────────────────
      if (request?.customer_email) {
        await sendEmail({
          to: request.customer_email,
          subject: `Booking confirmed ${jobNo} — payment received`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <div style="background:#000;padding:20px 28px;">
                <h2 style="color:#fff;margin:0;">Booking Confirmed ✅</h2>
                <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
              </div>
              <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
                <p>Hi ${request.customer_name || "there"},</p>
                <p>Your payment has been received and your booking is confirmed with <strong>${companyName}</strong>.</p>
                <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
                  <p style="margin:0 0 8px;font-weight:700;">Booking Summary</p>
                  <table style="width:100%;font-size:14px;border-collapse:collapse;">
                    <tr><td style="padding:4px 0;color:#666;">Booking reference</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
                    <tr><td style="padding:4px 0;color:#666;">Car hire partner</td><td style="text-align:right;">${companyName}</td></tr>
                    <tr><td style="padding:4px 0;color:#666;">Pickup</td><td style="text-align:right;">${pickupTime}</td></tr>
                    <tr><td style="padding:4px 0;color:#666;">Pickup address</td><td style="text-align:right;">${request.pickup_address || "—"}</td></tr>
                    ${request.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">Drop-off address</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
                    <tr style="border-top:1px solid #ddd;">
                      <td style="padding:8px 0 4px;color:#666;">Car hire</td><td style="text-align:right;">${fmtCharge(chargeCarHire)}</td>
                    </tr>
                    <tr><td style="padding:4px 0;color:#666;">Fuel deposit</td><td style="text-align:right;">${fmtCharge(chargeFuel)}</td></tr>
                    <tr style="border-top:1px solid #ddd;">
                      <td style="padding:8px 0 4px;font-weight:700;">Total paid</td>
                      <td style="text-align:right;font-weight:700;">${fmtCharge(chargeTotalPrice)}</td>
                    </tr>
                  </table>
                  <p style="margin:8px 0 0;font-size:13px;color:#666;">The fuel deposit will be refunded at the end of your hire based on fuel used.</p>
                </div>
                <a href="${siteUrl}/bookings/${requestId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View Booking</a>
                <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
              </div>
            </div>
          `,
        }).catch(e => console.error("Customer booking confirmed email failed:", e?.message));
      }

      // ── Email partner — new booking ──────────────────────────────────────
      if (partnerEmail) {
        await sendEmail({
          to: partnerEmail,
          subject: `New booking confirmed ${jobNo}`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <div style="background:#000;padding:20px 28px;">
                <h2 style="color:#fff;margin:0;">New Booking Confirmed</h2>
                <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
              </div>
              <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
                <p>Hi ${partnerProfile?.contact_name || companyName},</p>
                <p>A customer has paid and confirmed booking ${jobNo}. Please prepare for collection.</p>
                <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
                  <p style="margin:0 0 8px;font-weight:700;">Booking Details</p>
                  <table style="width:100%;font-size:14px;border-collapse:collapse;">
                    <tr><td style="padding:4px 0;color:#666;">Booking reference</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
                    <tr><td style="padding:4px 0;color:#666;">Customer</td><td style="text-align:right;">${request?.customer_name || "—"}</td></tr>
                    <tr><td style="padding:4px 0;color:#666;">Pickup time</td><td style="text-align:right;">${pickupTime}</td></tr>
                    <tr><td style="padding:4px 0;color:#666;">Pickup address</td><td style="text-align:right;">${request?.pickup_address || "—"}</td></tr>
                    ${request?.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">Drop-off address</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
                    <tr style="border-top:1px solid #ddd;">
                      <td style="padding:8px 0 4px;color:#666;">Car hire</td><td style="text-align:right;">${fmtBid(bidCarHire)}</td>
                    </tr>
                    <tr><td style="padding:4px 0;color:#666;">Fuel deposit</td><td style="text-align:right;">${fmtBid(bidFuel)}</td>
                    </tr>
                  </table>
                </div>
                <a href="${portalUrl}/partner/bookings/${bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View Booking</a>
                <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
              </div>
            </div>
          `,
        }).catch(e => console.error("Partner new booking email failed:", e?.message));
      }

      // ── Email admin — new booking ────────────────────────────────────────
      for (const adminEmail of adminEmails) {
        await sendEmail({
          to: adminEmail,
          subject: `[Admin] New booking ${jobNo} — ${companyName}`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <p>New booking confirmed.</p>
              <p>
                <strong>Booking:</strong> ${jobNo}<br/>
                <strong>Partner:</strong> ${companyName}<br/>
                <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
                <strong>Pickup:</strong> ${pickupTime}<br/>
                <strong>Pickup address:</strong> ${request?.pickup_address || "—"}<br/>
                <strong>Charge currency:</strong> ${chargeCurrency} — car hire ${fmtCharge(chargeCarHire)}, fuel ${fmtCharge(chargeFuel)}, total ${fmtCharge(chargeTotalPrice)}<br/>
                <strong>Bid currency:</strong> ${bidCurrency} — car hire ${fmtBid(bidCarHire)}, fuel ${fmtBid(bidFuel)}<br/>
                <strong>Commission:</strong> ${fmtCharge(commissionAmt)} (${commissionRate}%)<br/>
                <strong>Partner net:</strong> ${fmtCharge(partnerNet)}<br/>
                <strong>Stripe fee:</strong> ${feeData.stripe_fee != null ? `${feeData.stripe_fee} ${feeData.stripe_fee_currency}` : "pending"}
              </p>
            </div>
          `,
        }).catch(e => console.error("Admin new booking email failed:", e?.message));
      }

      console.log(`payment_intent.succeeded: booking ${bookingId} — bid ${bidCurrency}, charge ${chargeCurrency}, rate ${conversionRate}, fee ${feeData.stripe_fee} ${feeData.stripe_fee_currency}`);
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}