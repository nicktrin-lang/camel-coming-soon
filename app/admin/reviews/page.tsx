"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string; booking_id: string; job_number: number | null;
  partner_user_id: string; partner_company_name: string;
  rating: number; comment: string | null;
  partner_reply: string | null; partner_replied_at: string | null;
  is_visible: boolean; created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= rating ? "text-amber-400" : "text-black/10"}>★</span>
      ))}
    </span>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return v; }
}

export default function AdminReviewsPage() {
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [ok,       setOk]       = useState<string | null>(null);
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [filter,   setFilter]   = useState<"all" | "visible" | "hidden">("all");
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/admin/reviews", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load reviews");
      setReviews(json.reviews || []);
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggleVisibility(reviewId: string, currentlyVisible: boolean) {
    setToggling(reviewId); setError(null); setOk(null);
    try {
      const res  = await fetch("/api/admin/reviews", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, is_visible: !currentlyVisible }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update");
      setOk(currentlyVisible ? "Review hidden." : "Review restored.");
      await load();
    } catch (e: any) { setError(e?.message); }
    finally { setToggling(null); }
  }

  const filtered = reviews.filter(r =>
    filter === "all" ? true : filter === "visible" ? r.is_visible : !r.is_visible
  );

  const avgAll = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";
  const hidden = reviews.filter(r => !r.is_visible).length;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Review Moderation</h1>
          <p className="mt-1 text-sm text-black/50">All customer reviews across all partners. Hide reviews that violate community standards.</p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="border border-black/20 bg-white px-4 py-2 text-sm font-black text-black hover:bg-[#f0f0f0] disabled:opacity-50">
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {ok    && <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{ok}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Reviews", value: String(reviews.length), color: "text-black" },
          { label: "Platform Avg",  value: avgAll + " ★",          color: "text-amber-500" },
          { label: "Hidden",        value: String(hidden),          color: hidden > 0 ? "text-red-600" : "text-black/30" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-black/10 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
            <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "visible", "hidden"] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-5 py-2 text-sm font-black uppercase tracking-widest transition ${
              filter === f
                ? "bg-black text-white"
                : "border border-black/20 bg-white text-black hover:bg-[#f0f0f0]"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="border border-black/10 bg-white p-8 text-black/50">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-black/10 bg-white p-8 text-center text-black/50">No reviews found.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <div key={r.id} className={`border p-6 ${r.is_visible ? "border-black/10 bg-white" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-black">{r.partner_company_name}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <Stars rating={r.rating} />
                    <span className="text-xs font-bold text-black/40">
                      {r.job_number ? `Booking #${r.job_number} · ` : ""}{fmt(r.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.is_visible && (
                    <span className="border border-red-200 bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-red-700">
                      Hidden
                    </span>
                  )}
                  <button type="button" onClick={() => toggleVisibility(r.id, r.is_visible)}
                    disabled={toggling === r.id}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition disabled:opacity-50 ${
                      r.is_visible
                        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}>
                    {toggling === r.id ? "…" : r.is_visible ? "Hide" : "Restore"}
                  </button>
                </div>
              </div>

              {r.comment ? (
                <p className="mt-3 text-sm font-bold text-black">{r.comment}</p>
              ) : (
                <p className="mt-3 text-sm italic font-bold text-black/30">No written comment.</p>
              )}

              {r.partner_reply && (
                <div className="mt-3 border border-black/10 bg-[#f0f0f0] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black/50">
                    Partner reply · {fmt(r.partner_replied_at)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-black">{r.partner_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}