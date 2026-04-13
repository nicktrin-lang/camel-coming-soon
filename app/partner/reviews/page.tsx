"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string; booking_id: string; job_number: number | null;
  rating: number; comment: string | null;
  partner_reply: string | null; partner_replied_at: string | null;
  is_visible: boolean; created_at: string;
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={sz}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= rating ? "text-amber-400" : "text-slate-200"}>★</span>
      ))}
    </span>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return v; }
}

export default function PartnerReviewsPage() {
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [ok,        setOk]        = useState<string | null>(null);
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [avg,       setAvg]       = useState<number | null>(null);
  const [total,     setTotal]     = useState(0);
  const [dist,      setDist]      = useState<{ stars: number; count: number }[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/reviews", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load reviews");
      setReviews(json.reviews || []);
      setAvg(json.avg);
      setTotal(json.total || 0);
      setDist(json.distribution || []);
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function submitReply(reviewId: string) {
    const reply = (replyText[reviewId] || "").trim();
    if (!reply) return;
    setSaving(reviewId); setError(null); setOk(null);
    try {
      const res  = await fetch("/api/partner/reviews", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, reply }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit reply");
      setOk("Reply submitted.");
      setReplyText(p => ({ ...p, [reviewId]: "" }));
      await load();
    } catch (e: any) { setError(e?.message); }
    finally { setSaving(null); }
  }

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#003768]">Customer Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">Reviews left by customers after completed bookings. You can reply once to each review.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok    && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      {/* Summary */}
      {!loading && total > 0 && (
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="text-center">
              <p className="text-5xl font-black text-[#003768]">{avg?.toFixed(1) ?? "—"}</p>
              <Stars rating={Math.round(avg ?? 0)} size="lg" />
              <p className="mt-1 text-sm text-slate-500">{total} review{total !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5,4,3,2,1].map(n => {
                const count = dist.find(d => d.stars === n)?.count ?? 0;
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right text-slate-500">{n}</span>
                    <span className="text-amber-400">★</span>
                    <div className="flex-1 rounded-full bg-slate-100 h-2">
                      <div className="h-2 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-slate-500">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-center">
          <p className="text-4xl">⭐</p>
          <p className="mt-3 text-lg font-semibold text-slate-700">No reviews yet</p>
          <p className="mt-1 text-sm text-slate-500">Reviews will appear here once customers complete bookings and leave feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Stars rating={r.rating} />
                  {r.job_number && <p className="mt-1 text-xs font-semibold text-slate-400">Booking #{r.job_number}</p>}
                </div>
                <p className="text-xs text-slate-400 shrink-0">{fmt(r.created_at)}</p>
              </div>

              {r.comment ? (
                <p className="mt-3 text-slate-700">{r.comment}</p>
              ) : (
                <p className="mt-3 text-sm italic text-slate-400">No written comment.</p>
              )}

              {/* Partner reply */}
              {r.partner_reply ? (
                <div className="mt-4 rounded-2xl border border-[#003768]/10 bg-[#003768]/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#003768]">Your reply · {fmt(r.partner_replied_at)}</p>
                  <p className="mt-1 text-sm text-slate-700">{r.partner_reply}</p>
                </div>
              ) : (
                <div className="mt-4">
                  <label className="text-sm font-medium text-[#003768]">Reply to this review (one reply only)</label>
                  <textarea rows={3} value={replyText[r.id] || ""} onChange={e => setReplyText(p => ({ ...p, [r.id]: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#0f4f8a]"
                    placeholder="Thank the customer or respond to their feedback…" />
                  <button type="button" onClick={() => submitReply(r.id)}
                    disabled={saving === r.id || !(replyText[r.id] || "").trim()}
                    className="mt-2 rounded-full bg-[#003768] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    {saving === r.id ? "Submitting…" : "Submit Reply"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}