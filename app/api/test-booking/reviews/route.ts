import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUser(accessToken?: string | null) {
  if (!accessToken) return null;
  const { data, error } = await createCustomerServiceRoleSupabaseClient().auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

// Simple bad word filter — add more as needed
const BAD_WORDS = [
  "fuck", "shit", "cunt", "bastard", "asshole", "dick", "bitch", "wanker",
  "puta", "mierda", "coño", "joder", "hostia", "gilipollas",
];

function containsBadWords(text: string): boolean {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
}

// POST — submit a review
// GET  — fetch review for a booking (by booking_id query param)
export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUser(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const bookingId    = String(body?.booking_id || "").trim();
    const rating       = Number(body?.rating);
    const comment      = String(body?.comment || "").trim();

    if (!bookingId) return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
    if (comment && containsBadWords(comment)) {
      return NextResponse.json({ error: "Your review contains language that is not permitted. Please revise and resubmit." }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    // Verify customer owns this booking and it is completed
    const { data: booking } = await db
      .from("partner_bookings")
      .select("id, partner_user_id, request_id, booking_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.booking_status !== "completed") {
      return NextResponse.json({ error: "Reviews can only be submitted for completed bookings" }, { status: 400 });
    }

    const { data: request } = await db
      .from("customer_requests")
      .select("customer_user_id")
      .eq("id", booking.request_id)
      .maybeSingle();

    if (!request || request.customer_user_id !== customerUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check not already reviewed
    const { data: existing } = await db
      .from("partner_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: "You have already reviewed this booking" }, { status: 400 });

    const { data: review, error: insertErr } = await db
      .from("partner_reviews")
      .insert({
        booking_id:       bookingId,
        partner_user_id:  booking.partner_user_id,
        customer_user_id: customerUser.id,
        rating,
        comment:          comment || null,
        is_visible:       true,
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, review }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUser(accessToken);
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("booking_id");
    if (!bookingId) return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();

    const { data: review } = await db
      .from("partner_reviews")
      .select("id, rating, comment, partner_reply, partner_replied_at, created_at, is_visible")
      .eq("booking_id", bookingId)
      .maybeSingle();

    return NextResponse.json({ review: review || null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}