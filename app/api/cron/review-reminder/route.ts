import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendReviewReminderEmail } from "@/lib/email";

// Called by Vercel cron — add to vercel.json:
// { "crons": [{ "path": "/api/cron/review-reminder", "schedule": "0 10 * * *" }] }
// Runs daily at 10am UTC. Sends one reminder per completed booking after 7 days with no review.

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleSupabaseClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: bookings, error } = await db
    .from("partner_bookings")
    .select("id, job_number, request_id, review_reminder_sent_at")
    .eq("booking_status", "completed")
    .lt("created_at", sevenDaysAgo)
    .is("review_reminder_sent_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!bookings?.length) return NextResponse.json({ ok: true, sent: 0 }, { status: 200 });

  const bookingIds = bookings.map((b: any) => b.id);
  const { data: existingReviews } = await db
    .from("partner_reviews")
    .select("booking_id")
    .in("booking_id", bookingIds);

  const reviewedIds = new Set((existingReviews || []).map((r: any) => r.booking_id));
  const toRemind = bookings.filter((b: any) => !reviewedIds.has(b.id));

  if (!toRemind.length) return NextResponse.json({ ok: true, sent: 0 }, { status: 200 });

  const requestIds = toRemind.map((b: any) => b.request_id).filter(Boolean);
  const { data: requests } = await db
    .from("customer_requests")
    .select("id, customer_email, customer_name")
    .in("id", requestIds);

  const requestMap = new Map((requests || []).map((r: any) => [r.id, r]));

  let sent = 0;
  for (const booking of toRemind) {
    const request = requestMap.get(booking.request_id);
    if (!request?.customer_email) continue;
    try {
      // Pass request_id (not booking.id) so the URL resolves correctly on the customer portal
      await sendReviewReminderEmail(request.customer_email, booking.job_number, booking.request_id);
      await db
        .from("partner_bookings")
        .update({ review_reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
      sent++;
    } catch (e) {
      console.error("Failed to send review reminder for booking", booking.id, e);
    }
  }

  return NextResponse.json({ ok: true, sent }, { status: 200 });
}