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

  const avgAll   = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const hidden   = reviews.filter(r => !r.is_visible).length;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Review Moderation</h1>
          <p className="mt-1 text-sm text-slate-500">All customer reviews across all partners. Hide reviews that violate community standards.</p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-50">
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok    && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Reviews", value: reviews.length, color: "text-[#003768]" },
          { label: "Platform Avg", value: avgAll + " ★", color: "text-amber-600" },
          { label: "Hidden", value: hidden, color: hidden > 0 ? "text-red-600" : "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "visible", "hidden"] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
              filter === f ? "bg-[#003768] text-white" : "border border-black/10 bg-white text-slate-600 hover:bg-black/5"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-center text-slate-500">No reviews found.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <div key={r.id} className={`rounded-3xl border p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] ${
              r.is_visible ? "border-black/5 bg-white" : "border-red-200 bg-red-50"
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#003768]">{r.partner_company_name}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-slate-400">
                      {r.job_number ? `Booking #${r.job_number} · ` : ""}{fmt(r.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.is_visible && (
                    <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Hidden</span>
                  )}
                  <button type="button" onClick={() => toggleVisibility(r.id, r.is_visible)}
                    disabled={toggling === r.id}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      r.is_visible
                        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    } disabled:opacity-50`}>
                    {toggling === r.id ? "…" : r.is_visible ? "Hide" : "Restore"}
                  </button>
                </div>
              </div>

              {r.comment ? (
                <p className="mt-3 text-slate-700">{r.comment}</p>
              ) : (
                <p className="mt-3 text-sm italic text-slate-400">No written comment.</p>
              )}

              {r.partner_reply && (
                <div className="mt-3 rounded-2xl border border-[#003768]/10 bg-[#003768]/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#003768]">Partner reply · {fmt(r.partner_replied_at)}</p>
                  <p className="mt-1 text-sm text-slate-700">{r.partner_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}