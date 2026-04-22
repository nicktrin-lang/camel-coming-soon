"use client";

// This is the new /bookings/[id] page — identical logic to /test-booking/requests/[id]
// but using /bookings/* links throughout and the new auth redirect URLs.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useCurrency } from "@/lib/useCurrency";
import type { Currency } from "@/lib/currency";

type RequestData = {
  id: string; job_number: number | null; pickup_address: string;
  dropoff_address: string | null; pickup_at: string; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number; suitcases: number;
  hand_luggage: number; vehicle_category_name: string | null; notes: string | null;
  status: string; created_at: string; expires_at: string | null;
};
type BidRow = {
  id: string; partner_user_id: string; partner_company_name: string | null;
  partner_contact_name: string | null; partner_phone: string | null;
  partner_address: string | null; vehicle_category_name: string;
  car_hire_price: number; fuel_price: number; total_price: number;
  full_insurance_included: boolean; full_tank_included: boolean;
  notes: string | null; status: string; created_at: string;
  currency: Currency; avg_rating: number | null; review_count: number;
};
type ExistingReview = {
  id: string; rating: number; comment: string | null;
  partner_reply: string | null; partner_replied_at: string | null; created_at: string;
};
type BookingData = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; notes: string | null;
  created_at: string; job_number: number | null; assigned_driver_id?: string | null;
  company_name: string | null; company_phone: string | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  fuel_price: number | null; car_hire_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
  currency: Currency;
  collection_confirmed_by_driver: boolean; collection_confirmed_by_driver_at: string | null;
  collection_fuel_level_driver: string | null;
  return_confirmed_by_driver: boolean; return_confirmed_by_driver_at: string | null;
  return_fuel_level_driver: string | null;
  collection_confirmed_by_partner: boolean; collection_confirmed_by_partner_at: string | null;
  collection_fuel_level_partner: string | null; collection_partner_notes: string | null;
  return_confirmed_by_partner: boolean; return_confirmed_by_partner_at: string | null;
  return_fuel_level_partner: string | null; return_partner_notes: string | null;
  collection_confirmed_by_customer: boolean; collection_confirmed_by_customer_at: string | null;
  collection_fuel_level_customer: string | null; collection_customer_notes: string | null;
  return_confirmed_by_customer: boolean; return_confirmed_by_customer_at: string | null;
  return_fuel_level_customer: string | null; return_customer_notes: string | null;
  insurance_docs_confirmed_by_driver: boolean; insurance_docs_confirmed_by_driver_at: string | null;
  insurance_docs_confirmed_by_customer: boolean; insurance_docs_confirmed_by_customer_at: string | null;
  has_review: boolean; existing_review: ExistingReview | null;
};
type ResponseShape = { request: RequestData; bids: BidRow[]; booking: BookingData | null };
type ConfirmSection = "collection" | "return";
type Rates = { GBP: number; USD: number };

function normalizeFuel(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s === "empty") return "empty";
  if (s === "quarter") return "quarter";
  if (s === "half") return "half";
  if (s === "three_quarter" || s === "3/4") return "3/4";
  if (s === "full") return "full";
  return null;
}
function fuelLabel(v: unknown): string {
  switch (normalizeFuel(v)) {
    case "empty":   return "Empty";
    case "quarter": return "¼ Tank";
    case "half":    return "½ Tank";
    case "3/4":     return "¾ Tank";
    case "full":    return "Full Tank";
    default:        return "—";
  }
}
const FUEL_BARS: Record<string, number> = { empty: 0, quarter: 1, half: 2, "3/4": 3, full: 4 };
function FuelBar({ level }: { level: string | null }) {
  const n = normalizeFuel(level);
  const filled = n ? (FUEL_BARS[n] ?? 0) : 0;
  return (
    <div className="flex gap-1 mt-1">
      {[0,1,2,3].map(i => (
        <div key={i} className={["h-3 flex-1 rounded-full", i < filled ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400" : "bg-slate-200"].join(" ")} />
      ))}
    </div>
  );
}
function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}
function formatDuration(m?: number | null) {
  if (!m) return "—";
  if (m >= 1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)===1?"":"s"}`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), mins = m%60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}
function getTimeRemaining(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, label: "Expired" };
  const s = Math.floor(diff/1000);
  const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return { expired: false, label: d>0 ? `${d}d ${h}h ${m}m` : h>0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s` };
}
function bookingStatusLabel(s?: string | null) {
  switch (String(s||"").toLowerCase()) {
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Awaiting delivery";
    case "collected": case "returned": return "On Hire";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s||"—").replaceAll("_"," ");
  }
}
const QUARTER_LABELS: Record<number, string> = { 0:"Empty",1:"¼ Tank",2:"½ Tank",3:"¾ Tank",4:"Full Tank" };
const LOCALE_MAP: Record<Currency, string> = { EUR:"es-ES",GBP:"en-GB",USD:"en-US" };
function fmtCurr(a: number, c: Currency) { return new Intl.NumberFormat(LOCALE_MAP[c],{style:"currency",currency:c}).format(a); }
function convertAmount(a: number, from: Currency, to: Currency, r: Rates) {
  if (from===to) return a;
  let eur = a;
  if (from==="GBP") eur = Math.round((a/r.GBP)*100)/100;
  if (from==="USD") eur = Math.round((a/r.USD)*100)/100;
  if (to==="EUR") return eur;
  if (to==="GBP") return Math.round(eur*r.GBP*100)/100;
  return Math.round(eur*r.USD*100)/100;
}
function BidAmount({ amount, bidCurrency, customerCurrency, rates }: { amount:number|null|undefined; bidCurrency:Currency; customerCurrency:Currency; rates:Rates }) {
  if (amount==null||isNaN(amount)) return <span>—</span>;
  const p = convertAmount(amount,bidCurrency,customerCurrency,rates);
  const s = bidCurrency!==customerCurrency ? fmtCurr(amount,bidCurrency) : null;
  return <span>{fmtCurr(p,customerCurrency)}{s&&<span className="opacity-60 text-[0.85em] ml-1">({s})</span>}</span>;
}
function BookingAmount({ amount, storedCurrency, customerCurrency, rates }: { amount:number|null|undefined; storedCurrency:Currency; customerCurrency:Currency; rates:Rates }) {
  if (amount==null||isNaN(Number(amount))) return <span>—</span>;
  const n = Number(amount);
  const p = convertAmount(n,storedCurrency,customerCurrency,rates);
  const o: Currency = customerCurrency==="EUR"?"GBP":"EUR";
  return <span>{fmtCurr(p,customerCurrency)} <span className="opacity-60 text-[0.85em]">({fmtCurr(convertAmount(n,storedCurrency,o,rates),o)})</span></span>;
}

const BAD_WORDS = ["fuck","shit","cunt","bastard","asshole","dick","bitch","wanker","puta","mierda","coño","joder","hostia","gilipollas"];
function containsBadWords(t: string) { return BAD_WORDS.some(w => t.toLowerCase().includes(w)); }

function StarPicker({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  const [hovered,setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)} onClick={()=>onChange(n)} className="text-3xl leading-none transition-transform hover:scale-110">
          <span className={(hovered||value)>=n?"text-amber-400":"text-slate-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ bookingId, accessToken, existingReview, onReviewSubmitted }: { bookingId:string; accessToken:string; existingReview:ExistingReview|null; onReviewSubmitted:()=>void }) {
  const [rating,setRating]    = useState(existingReview?.rating??0);
  const [comment,setComment]  = useState(existingReview?.comment??"");
  const [saving,setSaving]    = useState(false);
  const [error,setError]      = useState<string|null>(null);
  const [submitted,setSubmitted] = useState(!!existingReview);

  async function submit() {
    if (!rating) { setError("Please select a star rating."); return; }
    if (comment && containsBadWords(comment)) { setError("Your review contains language that is not permitted."); return; }
    setSaving(true); setError(null);
    try {
      const res  = await fetch("/api/test-booking/reviews",{ method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`}, body:JSON.stringify({booking_id:bookingId,rating,comment}) });
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to submit review");
      setSubmitted(true); onReviewSubmitted();
    } catch(e:any) { setError(e?.message); }
    finally { setSaving(false); }
  }

  return (
    <div id="review" className={`rounded-3xl border p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] ${submitted?"border-green-200 bg-green-50":"border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center gap-3"><span className="text-2xl">⭐</span><h2 className="text-2xl font-semibold text-[#003768]">{submitted?"Your Review":"Leave a Review"}</h2></div>
      <p className="mt-2 text-sm text-slate-500">{submitted?"Thank you for your feedback.":"How was your experience?"}</p>
      {submitted ? (
        <>
          <div className="mt-4 flex gap-0.5">{[1,2,3,4,5].map(n=><span key={n} className={`text-2xl ${n<=rating?"text-amber-400":"text-slate-200"}`}>★</span>)}</div>
          {comment && <p className="mt-2 text-slate-700">{comment}</p>}
          {existingReview?.partner_reply && (
            <div className="mt-4 rounded-2xl border border-[#003768]/10 bg-[#003768]/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#003768]">Partner reply · {fmt(existingReview.partner_replied_at)}</p>
              <p className="mt-1 text-sm text-slate-700">{existingReview.partner_reply}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-4"><p className="text-sm font-medium text-[#003768] mb-2">Your rating</p><StarPicker value={rating} onChange={setRating} /></div>
          <div className="mt-4">
            <label className="text-sm font-medium text-[#003768]">Comment (optional)</label>
            <textarea rows={3} value={comment} onChange={e=>setComment(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#0f4f8a]" placeholder="Tell us about your experience…" />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button type="button" onClick={submit} disabled={saving||!rating} className="mt-4 w-full rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-50 active:scale-95 transition-transform">
            {saving?"Submitting…":"Submit Review"}
          </button>
        </>
      )}
    </div>
  );
}

function InsuranceConfirmCard({ driverConfirmed,driverConfirmedAt,customerConfirmed,customerConfirmedAt,insuranceChecked,onInsuranceChange,onConfirm,onUnconfirm,saving,locked }: { driverConfirmed:boolean;driverConfirmedAt:string|null;customerConfirmed:boolean;customerConfirmedAt:string|null;insuranceChecked:boolean;onInsuranceChange:(v:boolean)=>void;onConfirm:()=>void;onUnconfirm:()=>void;saving:boolean;locked:boolean }) {
  return (
    <div className={`rounded-3xl border p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] ${locked?"border-green-200 bg-green-50":"border-black/5 bg-white"}`}>
      <div className="flex items-center gap-3"><span className="text-2xl">📄</span><h2 className="text-2xl font-semibold text-[#003768]">Insurance Documents</h2></div>
      <p className="mt-2 text-sm text-slate-500">The driver must hand you the insurance paperwork at delivery.</p>
      <div className={`mt-4 rounded-2xl border p-4 ${driverConfirmed?"border-blue-200 bg-blue-50":"border-slate-200 bg-slate-50"}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver confirmed handover</p>
        {driverConfirmed ? <><p className="mt-1 text-lg font-bold text-blue-700">✓ Driver confirmed</p><p className="mt-0.5 text-xs text-slate-400">{fmt(driverConfirmedAt)}</p></> : <p className="mt-1 text-sm italic text-slate-400">Waiting for driver…</p>}
      </div>
      {locked ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-100 p-4 text-sm font-semibold text-green-800">✓ Both you and the driver have confirmed insurance documents were handed over.</div>
      ) : (
        <>
          {customerConfirmed && <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">You confirmed receipt at {fmt(customerConfirmedAt)}</div>}
          {!customerConfirmed && (
            <label className={`mt-4 flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition ${insuranceChecked?"border-green-400 bg-green-50":"border-black/10 bg-slate-50"}`}>
              <input type="checkbox" checked={insuranceChecked} onChange={e=>onInsuranceChange(e.target.checked)} disabled={!driverConfirmed||saving} className="mt-0.5 h-5 w-5 shrink-0 accent-[#003768]" />
              <div><p className="text-sm font-semibold text-[#003768]">I confirm I have received the insurance documents</p></div>
            </label>
          )}
          <div className="mt-4 flex gap-3">
            {!customerConfirmed ? (
              <button type="button" onClick={onConfirm} disabled={saving||!driverConfirmed||!insuranceChecked} className="flex-1 rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-50 active:scale-95 transition-transform">
                {saving?"Saving…":!driverConfirmed?"Waiting for driver…":!insuranceChecked?"Tick box above to confirm":"✓ Confirm receipt of documents"}
              </button>
            ) : (
              <button type="button" onClick={onUnconfirm} disabled={saving} className="flex-1 rounded-full border border-black/10 bg-white py-3 font-semibold text-slate-700 hover:bg-black/5 disabled:opacity-50">{saving?"Saving…":"Dispute / I did not receive them"}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FuelConfirmCard({ title,driverConfirmed,driverFuel,driverConfirmedAt,customerConfirmed,customerConfirmedAt,locked,notes,onNotesChange,onConfirm,onUnconfirm,saving }: { title:string;driverConfirmed:boolean;driverFuel:string|null;driverConfirmedAt:string|null;customerConfirmed:boolean;customerConfirmedAt:string|null;locked:boolean;notes:string;onNotesChange:(v:string)=>void;onConfirm:()=>void;onUnconfirm:()=>void;saving:boolean }) {
  return (
    <div className={`rounded-3xl border p-6 ${locked?"border-green-200 bg-green-50":"border-black/5 bg-white"} shadow-[0_18px_45px_rgba(0,0,0,0.08)]`}>
      <h2 className="text-2xl font-semibold text-[#003768]">{title}</h2>
      <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver recorded</p>
        {driverConfirmed&&driverFuel ? <><p className="mt-1 text-2xl font-bold text-[#003768]">{fuelLabel(driverFuel)}</p><FuelBar level={driverFuel} /><p className="mt-1 text-xs text-slate-400">{fmt(driverConfirmedAt)}</p></> : <p className="mt-1 text-sm text-slate-500 italic">Waiting for driver…</p>}
      </div>
      {locked ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-100 p-4 text-sm text-green-800 font-semibold">✓ Confirmed and locked — you and the driver agree on {fuelLabel(driverFuel)}</div>
      ) : (
        <>
          {customerConfirmed && <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">You confirmed this at {fmt(customerConfirmedAt)}</div>}
          <div className="mt-4">
            <label className="text-sm font-medium text-[#003768]">Notes (optional)</label>
            <textarea rows={3} value={notes} onChange={e=>onNotesChange(e.target.value)} disabled={locked} className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#0f4f8a] disabled:opacity-60" placeholder="Any notes…" />
          </div>
          <div className="mt-4 flex gap-3">
            {!customerConfirmed ? (
              <button type="button" onClick={onConfirm} disabled={saving||!driverConfirmed} className="flex-1 rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-50 active:scale-95 transition-transform">
                {saving?"Saving…":!driverConfirmed?"Waiting for driver…":"✓ I agree with this fuel level"}
              </button>
            ) : (
              <button type="button" onClick={onUnconfirm} disabled={saving} className="flex-1 rounded-full border border-black/10 bg-white py-3 font-semibold text-slate-700 hover:bg-black/5 disabled:opacity-50">{saving?"Saving…":"Dispute / Change"}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type ReviewItem = { id:string;rating:number;comment:string|null;partner_reply:string|null;partner_replied_at:string|null;created_at:string };

function BidCard({ bid,currency,rates,requestStatus,acceptingId,expired,onAccept }: { bid:BidRow;currency:Currency;rates:Rates;requestStatus:string;acceptingId:string|null;expired:boolean;onAccept:(id:string)=>void }) {
  const [showReviews,setShowReviews] = useState(false);
  const [reviews,setReviews]         = useState<ReviewItem[]>([]);
  const [loadingRevs,setLoadingRevs] = useState(false);

  async function toggleReviews() {
    if (showReviews) { setShowReviews(false); return; }
    setShowReviews(true);
    if (reviews.length>0) return;
    setLoadingRevs(true);
    try { const r=await fetch(`/api/test-booking/reviews?partner_user_id=${bid.partner_user_id}`); const j=await r.json().catch(()=>null); setReviews(j?.reviews||[]); } catch { setReviews([]); }
    finally { setLoadingRevs(false); }
  }

  return (
    <div className="rounded-2xl border border-black/10 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2 text-slate-700 flex-1">
          <h3 className="text-xl font-semibold text-[#003768]">{bid.partner_company_name||"Car Hire Company"}</h3>
          {bid.avg_rating!=null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span>{[1,2,3,4,5].map(n=><span key={n} className={n<=Math.round(bid.avg_rating!)?"text-amber-400":"text-slate-300"}>★</span>)}</span>
              <span className="text-amber-600 font-semibold text-sm">{bid.avg_rating.toFixed(1)}</span>
              <button type="button" onClick={toggleReviews} className="text-sm text-[#003768] underline underline-offset-2 hover:opacity-70">
                {showReviews?"Hide reviews":`Read ${bid.review_count} review${bid.review_count!==1?"s":""}`}
              </button>
            </div>
          ) : <p className="text-xs text-slate-400">No reviews yet</p>}
          {showReviews && (
            <div className="rounded-2xl border border-black/5 bg-slate-50 p-4 space-y-4">
              {loadingRevs ? <p className="text-sm text-slate-400">Loading…</p> : reviews.length===0 ? <p className="text-sm text-slate-400">No reviews to show.</p> : reviews.map(r=>(
                <div key={r.id} className="border-b border-black/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2"><span>{[1,2,3,4,5].map(n=><span key={n} className={n<=r.rating?"text-amber-400":"text-slate-200"}>★</span>)}</span><span className="text-xs text-slate-400">{fmt(r.created_at)}</span></div>
                  {r.comment?<p className="mt-1 text-sm text-slate-700">{r.comment}</p>:<p className="mt-1 text-xs italic text-slate-400">No written comment.</p>}
                  {r.partner_reply && <div className="mt-2 rounded-xl border border-[#003768]/10 bg-[#003768]/5 px-3 py-2"><p className="text-xs font-semibold text-[#003768]">Partner reply</p><p className="text-xs text-slate-600 mt-0.5">{r.partner_reply}</p></div>}
                </div>
              ))}
            </div>
          )}
          <p><span className="font-semibold text-slate-900">Phone:</span> {bid.partner_phone||"—"}</p>
          <p><span className="font-semibold text-slate-900">Vehicle:</span> {bid.vehicle_category_name}</p>
          <p><span className="font-semibold text-slate-900">Car hire:</span> <BidAmount amount={bid.car_hire_price} bidCurrency={bid.currency??"EUR"} customerCurrency={currency} rates={rates} /></p>
          <p><span className="font-semibold text-slate-900">Fuel deposit:</span> <BidAmount amount={bid.fuel_price} bidCurrency={bid.currency??"EUR"} customerCurrency={currency} rates={rates} /></p>
          <p><span className="font-semibold text-slate-900">Total:</span> <BidAmount amount={bid.total_price} bidCurrency={bid.currency??"EUR"} customerCurrency={currency} rates={rates} /></p>
          <p><span className="font-semibold text-slate-900">Insurance included:</span> {bid.full_insurance_included?"Yes":"No"}</p>
          {bid.notes && <p><span className="font-semibold text-slate-900">Notes:</span> {bid.notes}</p>}
        </div>
        <div className="shrink-0">
          {bid.status==="accepted" ? <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">Accepted</span>
          : requestStatus==="confirmed" ? <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-500">Closed</span>
          : <button type="button" onClick={()=>onAccept(bid.id)} disabled={!!acceptingId||expired} className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
              {acceptingId===bid.id?"Accepting...":"Accept Bid"}
            </button>}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router   = useRouter();
  const { rates: hookRates, currency } = useCurrency();
  const [liveRates,       setLiveRates]       = useState<Rates>(hookRates ?? { GBP: 0.85, USD: 1.08 });
  const [rateIsLive,      setRateIsLive]      = useState(false);
  const [requestId,       setRequestId]       = useState("");
  const [authChecked,     setAuthChecked]     = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [acceptingId,     setAcceptingId]     = useState<string | null>(null);
  const [savingConfirm,   setSavingConfirm]   = useState<ConfirmSection | "insurance" | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [ok,              setOk]              = useState<string | null>(null);
  const [data,            setData]            = useState<ResponseShape | null>(null);
  const [timeLabel,       setTimeLabel]       = useState("—");
  const [expired,         setExpired]         = useState(false);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [returnNotes,     setReturnNotes]     = useState("");
  const [insuranceChecked,setInsuranceChecked]= useState(false);
  const [accessToken,     setAccessToken]     = useState("");

  useEffect(() => { params.then(r => setRequestId(r.id)); }, [params]);

  useEffect(() => {
    if (!requestId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace(`/login?next=/bookings/${requestId}`); }
      else { setAuthChecked(true); }
    });
  }, [requestId, supabase, router]);

  useEffect(() => {
    fetch("/api/currency/rate",{cache:"no-store"}).then(r=>r.json()).then(({rates,live})=>{
      setLiveRates({GBP:Number(rates?.GBP)||0.85,USD:Number(rates?.USD)||1.08});
      setRateIsLive(live);
    }).catch(()=>{});
  }, []);

  async function load(showSpinner = false) {
    if (!requestId || !authChecked) return;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      setAccessToken(session.access_token);
      const res  = await fetch(`/api/test-booking/requests/${requestId}`,{cache:"no-store",headers:{Authorization:`Bearer ${session.access_token}`}});
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to load.");
      setData(json);
      if (json.booking) {
        setCollectionNotes(json.booking.collection_customer_notes||"");
        setReturnNotes(json.booking.return_customer_notes||"");
      }
    } catch(e:any) { setError(e?.message||"Failed to load."); }
    finally { if (showSpinner) setLoading(false); }
  }

  useEffect(() => { load(true); }, [requestId, authChecked]);
  useEffect(() => {
    if (!requestId||!authChecked) return;
    const t = setInterval(()=>load(false), 10000);
    return () => clearInterval(t);
  }, [requestId, authChecked]);

  useEffect(() => {
    const exp = data?.request?.expires_at;
    if (!exp) { setTimeLabel("—"); setExpired(false); return; }
    const tick = () => { const r = getTimeRemaining(exp); setTimeLabel(r?.label||"—"); setExpired(!!r?.expired); };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data?.request?.expires_at]);

  async function acceptBid(bidId: string) {
    setAcceptingId(bidId); setError(null); setOk(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res  = await fetch("/api/test-booking/bids/accept",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({bid_id:bidId,currency})});
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to accept bid.");
      setOk("Bid accepted. Booking confirmed."); await load(false);
    } catch(e:any) { setError(e?.message||"Failed to accept bid."); }
    finally { setAcceptingId(null); }
  }

  async function saveConfirmation(section: ConfirmSection, confirmed: boolean) {
    if (!data?.booking?.id) return;
    setSavingConfirm(section); setError(null); setOk(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res  = await fetch(`/api/test-booking/bookings/${data.booking.id}/update`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({section,confirmed,notes:section==="collection"?collectionNotes:returnNotes})});
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to save.");
      setOk(section==="collection"?"Delivery fuel confirmed.":"Collection fuel confirmed."); await load(false);
    } catch(e:any) { setError(e?.message||"Failed to save."); }
    finally { setSavingConfirm(null); }
  }

  async function saveInsuranceConfirmation(confirmed: boolean) {
    if (!data?.booking?.id) return;
    setSavingConfirm("insurance"); setError(null); setOk(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res  = await fetch(`/api/test-booking/bookings/${data.booking.id}/update`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({section:"collection",insurance_only:true,insurance_confirmed:confirmed})});
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to save.");
      setOk(confirmed?"Insurance documents confirmed.":"Insurance confirmation removed."); await load(false);
    } catch(e:any) { setError(e?.message||"Failed to save."); }
    finally { setSavingConfirm(null); }
  }

  if (!authChecked) return null;
  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]"><p className="text-slate-600">Loading…</p></div></div>;
  if (!data?.request) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error||"Booking not found"}</div></div>;

  const bk = data.booking;
  const bkCurr: Currency = bk?.currency ?? "EUR";
  const collectionLocked = !!bk?.collection_confirmed_by_driver && !!bk?.collection_confirmed_by_customer && normalizeFuel(bk.collection_fuel_level_driver)===normalizeFuel(bk.collection_fuel_level_customer);
  const returnLocked     = !!bk?.return_confirmed_by_driver && !!bk?.return_confirmed_by_customer && normalizeFuel(bk.return_fuel_level_driver)===normalizeFuel(bk.return_fuel_level_customer);
  const insuranceLocked  = !!bk?.insurance_docs_confirmed_by_driver && !!bk?.insurance_docs_confirmed_by_customer;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok    && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Booking #{data.request.job_number ?? "—"}</h1>
          <p className="mt-1 text-slate-600">Review your booking and any bids received.</p>
        </div>
        <Link href="/bookings" className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">← My Bookings</Link>
      </div>

      {data.request.status==="open" && (
        <div className={`rounded-2xl border p-4 text-sm ${expired?"border-red-200 bg-red-50 text-red-700":"border-amber-200 bg-amber-50 text-amber-700"}`}>
          <span className="font-semibold">Bid window:</span> {timeLabel}
        </div>
      )}

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Booking Details</h2>
        <div className="mt-6 grid gap-3 text-slate-700 sm:grid-cols-2">
          {[
            ["Pickup", data.request.pickup_address],
            ["Drop-off", data.request.dropoff_address||"—"],
            ["Pickup time", new Date(data.request.pickup_at||"").toLocaleString()],
            ["Drop-off time", new Date(data.request.dropoff_at||"").toLocaleString()],
            ["Duration", formatDuration(data.request.journey_duration_minutes)],
            ["Passengers", data.request.passengers],
            ["Vehicle", data.request.vehicle_category_name||"—"],
            ["Status", data.request.status],
          ].map(([l,v])=>(
            <p key={String(l)}><span className="font-semibold text-slate-900">{l}:</span> {String(v)}</p>
          ))}
        </div>
      </div>

      {bk && (
        <>
          <div className="rounded-3xl border border-green-200 bg-green-50 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">Your Booking</h2>
            <div className="mt-6 grid gap-3 text-slate-700 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-900">Status:</span> {bookingStatusLabel(bk.booking_status)}</p>
              <p><span className="font-semibold text-slate-900">Car hire company:</span> {bk.company_name||"—"}</p>
              <p><span className="font-semibold text-slate-900">Company phone:</span> {bk.company_phone||"—"}</p>
              <p><span className="font-semibold text-slate-900">Driver:</span> {bk.driver_name||"—"}</p>
              <p><span className="font-semibold text-slate-900">Driver phone:</span> {bk.driver_phone||"—"}</p>
              <p><span className="font-semibold text-slate-900">Vehicle:</span> {bk.driver_vehicle||"—"}</p>
            </div>
            <div className="mt-6 rounded-2xl border border-green-200 bg-white p-4 space-y-3 text-slate-700">
              <p className="text-sm font-bold text-slate-900">Price Breakdown</p>
              <div className="flex justify-between text-sm"><span>Car hire</span><span className="font-semibold"><BookingAmount amount={bk.car_hire_price} storedCurrency={bkCurr} customerCurrency={currency} rates={liveRates} /></span></div>
              <div className="flex justify-between text-sm"><span>Full tank deposit <span className="text-slate-400 text-xs">(refundable)</span></span><span className="font-semibold"><BookingAmount amount={bk.fuel_price} storedCurrency={bkCurr} customerCurrency={currency} rates={liveRates} /></span></div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-3"><span className="font-bold text-slate-900">Total paid</span><span className="font-bold text-[#003768]"><BookingAmount amount={bk.amount} storedCurrency={bkCurr} customerCurrency={currency} rates={liveRates} /></span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {bk.company_phone && <a href={`https://wa.me/${bk.company_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-600">💬 WhatsApp Car Hire Company</a>}
              {bk.driver_phone  && <a href={`https://wa.me/${bk.driver_phone.replace(/\D/g,"")}`}  target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-600">💬 WhatsApp Driver</a>}
            </div>
          </div>

          {bk.booking_status==="completed" && (
            <ReviewCard bookingId={bk.id} accessToken={accessToken} existingReview={bk.existing_review} onReviewSubmitted={()=>load(false)} />
          )}

          <InsuranceConfirmCard
            driverConfirmed={bk.insurance_docs_confirmed_by_driver} driverConfirmedAt={bk.insurance_docs_confirmed_by_driver_at}
            customerConfirmed={bk.insurance_docs_confirmed_by_customer} customerConfirmedAt={bk.insurance_docs_confirmed_by_customer_at}
            insuranceChecked={insuranceChecked} onInsuranceChange={setInsuranceChecked}
            onConfirm={()=>saveInsuranceConfirmation(true)} onUnconfirm={()=>saveInsuranceConfirmation(false)}
            saving={savingConfirm==="insurance"} locked={insuranceLocked}
          />

          {(!collectionLocked||!returnLocked) && (
            <div className="grid gap-6 xl:grid-cols-2">
              <FuelConfirmCard title="Delivery Fuel" driverConfirmed={bk.collection_confirmed_by_driver} driverFuel={bk.collection_fuel_level_driver} driverConfirmedAt={bk.collection_confirmed_by_driver_at} customerConfirmed={bk.collection_confirmed_by_customer} customerConfirmedAt={bk.collection_confirmed_by_customer_at} locked={collectionLocked} notes={collectionNotes} onNotesChange={setCollectionNotes} onConfirm={()=>saveConfirmation("collection",true)} onUnconfirm={()=>saveConfirmation("collection",false)} saving={savingConfirm==="collection"} />
              <FuelConfirmCard title="Collection Fuel" driverConfirmed={bk.return_confirmed_by_driver} driverFuel={bk.return_fuel_level_driver} driverConfirmedAt={bk.return_confirmed_by_driver_at} customerConfirmed={bk.return_confirmed_by_customer} customerConfirmedAt={bk.return_confirmed_by_customer_at} locked={returnLocked} notes={returnNotes} onNotesChange={setReturnNotes} onConfirm={()=>saveConfirmation("return",true)} onUnconfirm={()=>saveConfirmation("return",false)} saving={savingConfirm==="return"} />
            </div>
          )}
        </>
      )}

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Bids</h2>
        {expired||data.request.status==="expired" ? (
          <p className="mt-4 text-red-700">This request has expired.</p>
        ) : data.bids.length===0 ? (
          <p className="mt-4 text-slate-600">No bids yet — partners in your area will be notified shortly.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map(bid=>(
              <BidCard key={bid.id} bid={bid} currency={currency} rates={liveRates} requestStatus={data.request.status} acceptingId={acceptingId} expired={expired} onAccept={acceptBid} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}