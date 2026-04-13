import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

const BAD_WORDS = [
  "fuck", "shit", "cunt", "bastard", "asshole", "dick", "bitch", "wanker",
  "puta", "mierda", "coño", "joder", "hostia", "gilipollas",
];

function containsBadWords(text: string): boolean {
  return BAD_WORDS.some(w => text.toLowerCase().includes(w));
}

// GET — fetch all reviews for the logged-in partner
export async function GET() {
  try {
    const { user, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();

    const { data: reviews, error } = await db
      .from("partner_reviews")
      .select("id, booking_id, rating, comment, partner_reply, partner_replied_at, is_visible, created_at")
      .eq("partner_user_id", user.id)
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Fetch job numbers for display
    const bookingIds = (reviews || []).map((r: any) => r.booking_id).filter(Boolean);
    let jobMap = new Map<string, number | null>();
    if (bookingIds.length > 0) {
      const { data: bookings } = await db
        .from("partner_bookings")
        .select("id, job_number")
        .in("id", bookingIds);
      jobMap = new Map((bookings || []).map((b: any) => [b.id, b.job_number]));
    }

    const data = (reviews || []).map((r: any) => ({
      ...r,
      job_number: jobMap.get(r.booking_id) ?? null,
    }));

    // Compute summary stats
    const total   = data.length;
    const avg     = total > 0 ? Math.round((data.reduce((s: number, r: any) => s + r.rating, 0) / total) * 10) / 10 : null;
    const dist    = [1,2,3,4,5].map(n => ({ stars: n, count: data.filter((r: any) => r.rating === n).length }));

    return NextResponse.json({ reviews: data, total, avg, distribution: dist }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// POST — partner submits a reply to a review (one reply only)
export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const reviewId = String(body?.review_id || "").trim();
    const reply    = String(body?.reply || "").trim();

    if (!reviewId) return NextResponse.json({ error: "Missing review_id" }, { status: 400 });
    if (!reply)    return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });
    if (containsBadWords(reply)) {
      return NextResponse.json({ error: "Your reply contains language that is not permitted." }, { status: 400 });
    }
    if (reply.length > 1000) {
      return NextResponse.json({ error: "Reply must be under 1000 characters" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    // Verify partner owns this review and hasn't replied yet
    const { data: review } = await db
      .from("partner_reviews")
      .select("id, partner_user_id, partner_reply")
      .eq("id", reviewId)
      .eq("partner_user_id", user.id)
      .maybeSingle();

    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (review.partner_reply) return NextResponse.json({ error: "You have already replied to this review" }, { status: 400 });

    const { error: updateErr } = await db
      .from("partner_reviews")
      .update({ partner_reply: reply, partner_replied_at: new Date().toISOString() })
      .eq("id", reviewId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}