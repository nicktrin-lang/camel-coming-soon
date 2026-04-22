"use client";

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
  hand_luggage: number; sport_equipment: string | null;
  vehicle_category_name: string | null; notes: string | null;
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
    <div className="flex gap-1 mt-2">
      {[0,1,2,3].map(i => (
        <div key={i} className={`h-3 flex-1 ${i < filled ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400" : "bg-[#f0f0f0]"}`} />
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
function sportEquipmentLabel(v: string | null): string {
  if (!v || v === "none") return "None";
  const map: Record<string, string> = {
    golf_single: "Golf clubs — 1 bag", golf_two: "Golf clubs — 2 bags",
    golf_three: "Golf clubs — 3 bags", golf_four: "Golf clubs — 4+ bags",
    skis_pair: "Skis / snowboard — 1 set", skis_two: "Skis / snowboard — 2 sets",
    skis_three: "Skis / snowboard — 3+ sets", bikes_one: "Bikes — 1",
    bikes_two: "Bikes — 2", bikes_three: "Bikes — 3+", other: "Other large equipment",
  };
  return map[v] || v;
}

const LOCALE_MAP: Record<Currency, string> = { EUR:"es-ES", GBP:"en-GB", USD:"en-US" };
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
          <span className={(hovered||value)>=n?"text-amber-400":"text-black/10"}>★</span>
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ bookingId, accessToken, existingReview, onReviewSubmitted }: { bookingId:string; accessToken:string; existingReview:ExistingReview|null; onReviewSubmitted:()=>void }) {
  const [rating,setRating]       = useState(existingReview?.rating??0);
  const [comment,setComment]     = useState(existingReview?.comment??"");
  const [saving,setSaving]       = useState(false);
  const [error,setError]         = useState<string|null>(null);
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
    <div id="review" className="bg-white p-6">
      <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-3">⭐ {submitted?"Your Review":"Leave a Review"}</p>
      <p className="text-sm font-semibold text-black/50 mb-4">{submitted?"Thank you for your feedback.":"How was your experience?"}</p>
      {submitted ? (
        <>
          <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(n=><span key={n} className={`text-2xl ${n<=rating?"text-amber-400":"text-black/10"}`}>★</span>)}</div>
          {comment && <p className="text-base font-semibold text-black">{comment}</p>}
          {existingReview?.partner_reply && (
            <div className="mt-4 bg-[#f0f0f0] px-4 py-3">
              <p className="text-xs font-black uppercase tracking-widest text-black mb-1">Partner reply · {fmt(existingReview.partner_replied_at)}</p>
              <p className="text-sm font-semibold text-black">{existingReview.partner_reply}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4"><StarPicker value={rating} onChange={setRating} /></div>
          <textarea rows={3} value={comment} onChange={e=>setComment(e.target.value)}
            className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] placeholder:text-black/30 resize-none mb-3"
            placeholder="Tell us about your experience…" />
          {error && <p className="text-sm font-semibold text-red-600 mb-3">{error}</p>}
          <button type="button" onClick={submit} disabled={saving||!rating}
            className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving?"Submitting…":"Submit Review"}
          </button>
        </>
      )}
    </div>
  );
}

function InsuranceConfirmCard({ driverConfirmed,driverConfirmedAt,customerConfirmed,customerConfirmedAt,insuranceChecked,onInsuranceChange,onConfirm,onUnconfirm,saving,locked }: { driverConfirmed:boolean;driverConfirmedAt:string|null;customerConfirmed:boolean;customerConfirmedAt:string|null;insuranceChecked:boolean;onInsuranceChange:(v:boolean)=>void;onConfirm:()=>void;onUnconfirm:()=>void;saving:boolean;locked:boolean }) {
  return (
    <div className={`p-6 ${locked?"bg-green-50 border border-green-200":"bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-widest text-black mb-1">📄 Insurance Documents</p>
      <p className="text-sm font-semibold text-black/50 mb-4">The driver must hand you the insurance paperwork at delivery.</p>
      <div className={`px-4 py-3 mb-4 ${driverConfirmed?"bg-black":"bg-[#f0f0f0]"}`}>
        <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">Driver confirmed handover</p>
        {driverConfirmed
          ? <><p className="text-base font-black text-white">✓ Driver confirmed</p><p className="text-xs text-white/40">{fmt(driverConfirmedAt)}</p></>
          : <p className="text-sm font-semibold text-black/40">Waiting for driver…</p>}
      </div>
      {locked ? (
        <div className="bg-green-100 px-4 py-3 text-sm font-black text-green-800">✓ Both you and the driver have confirmed insurance documents were handed over.</div>
      ) : (
        <>
          {customerConfirmed && <div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black mb-4">You confirmed receipt at {fmt(customerConfirmedAt)}</div>}
          {!customerConfirmed && (
            <label className={`flex items-start gap-3 p-3 cursor-pointer mb-4 border-2 transition ${insuranceChecked?"border-green-400 bg-green-50":"border-black/10 bg-[#f0f0f0]"}`}>
              <input type="checkbox" checked={insuranceChecked} onChange={e=>onInsuranceChange(e.target.checked)} disabled={!driverConfirmed||saving} className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-bold text-black">I confirm I have received the insurance documents</p>
            </label>
          )}
          <div className="flex gap-3">
            {!customerConfirmed ? (
              <button type="button" onClick={onConfirm} disabled={saving||!driverConfirmed||!insuranceChecked}
                className="flex-1 bg-[#ff7a00] py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving?"Saving…":!driverConfirmed?"Waiting for driver…":!insuranceChecked?"Tick box above to confirm":"✓ Confirm receipt of documents"}
              </button>
            ) : (
              <button type="button" onClick={onUnconfirm} disabled={saving}
                className="flex-1 bg-[#f0f0f0] py-4 text-sm font-black text-black hover:bg-[#e8e8e8] disabled:opacity-50">
                {saving?"Saving…":"Dispute / I did not receive them"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FuelConfirmCard({ title,driverConfirmed,driverFuel,driverConfirmedAt,customerConfirmed,customerConfirmedAt,locked,notes,onNotesChange,onConfirm,onUnconfirm,saving }: { title:string;driverConfirmed:boolean;driverFuel:string|null;driverConfirmedAt:string|null;customerConfirmed:boolean;customerConfirmedAt:string|null;locked:boolean;notes:string;onNotesChange:(v:string)=>void;onConfirm:()=>void;onUnconfirm:()=>void;saving:boolean }) {
  return (
    <div className={`p-6 ${locked?"bg-green-50 border border-green-200":"bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-widest text-black mb-4">{title}</p>
      <div className={`px-4 py-3 mb-4 ${driverConfirmed&&driverFuel?"bg-black":"bg-[#f0f0f0]"}`}>
        <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">Driver recorded</p>
        {driverConfirmed&&driverFuel
          ? <><p className="text-2xl font-black text-white">{fuelLabel(driverFuel)}</p><FuelBar level={driverFuel} /><p className="text-xs text-white/40 mt-1">{fmt(driverConfirmedAt)}</p></>
          : <p className="text-sm font-semibold text-black/40">Waiting for driver…</p>}
      </div>
      {locked ? (
        <div className="bg-green-100 px-4 py-3 text-sm font-black text-green-800">✓ Confirmed — you and the driver agree on {fuelLabel(driverFuel)}</div>
      ) : (
        <>
          {customerConfirmed && <div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black mb-4">You confirmed this at {fmt(customerConfirmedAt)}</div>}
          <textarea rows={3} value={notes} onChange={e=>onNotesChange(e.target.value)} disabled={locked}
            className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] disabled:opacity-50 resize-none mb-4"
            placeholder="Any notes…" />
          <div className="flex gap-3">
            {!customerConfirmed ? (
              <button type="button" onClick={onConfirm} disabled={saving||!driverConfirmed}
                className="flex-1 bg-[#ff7a00] py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving?"Saving…":!driverConfirmed?"Waiting for driver…":"✓ I agree with this fuel level"}
              </button>
            ) : (
              <button type="button" onClick={onUnconfirm} disabled={saving}
                className="flex-1 bg-[#f0f0f0] py-4 text-sm font-black text-black hover:bg-[#e8e8e8] disabled:opacity-50">
                {saving?"Saving…":"Dispute / Change"}
              </button>
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
    <div className="bg-[#f0f0f0] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-black text-black">{bid.partner_company_name||"Car Hire Company"}</h3>
          {bid.avg_rating!=null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span>{[1,2,3,4,5].map(n=><span key={n} className={n<=Math.round(bid.avg_rating!)?"text-amber-400":"text-black/10"}>★</span>)}</span>
              <span className="text-amber-600 font-black text-sm">{bid.avg_rating.toFixed(1)}</span>
              <button type="button" onClick={toggleReviews} className="text-sm font-bold text-black underline hover:opacity-70">
                {showReviews?"Hide reviews":`Read ${bid.review_count} review${bid.review_count!==1?"s":""}`}
              </button>
            </div>
          ) : <p className="text-xs font-semibold text-black/40">No reviews yet</p>}
          {showReviews && (
            <div className="bg-white p-4 space-y-4">
              {loadingRevs ? <p className="text-sm text-black/40">Loading…</p> : reviews.length===0 ? <p className="text-sm text-black/40">No reviews to show.</p> : reviews.map(r=>(
                <div key={r.id} className="border-b border-black/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1"><span>{[1,2,3,4,5].map(n=><span key={n} className={n<=r.rating?"text-amber-400":"text-black/10"}>★</span>)}</span><span className="text-xs text-black/30">{fmt(r.created_at)}</span></div>
                  {r.comment?<p className="text-sm font-semibold text-black">{r.comment}</p>:<p className="text-xs italic text-black/30">No written comment.</p>}
                  {r.partner_reply && <div className="mt-2 bg-[#f0f0f0] px-3 py-2"><p className="text-xs font-black text-black">Partner reply</p><p className="text-xs font-semibold text-black/70 mt-0.5">{r.partner_reply}</p></div>}
                </div>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-black"><span className="font-black">Phone:</span> {bid.partner_phone||"—"}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Vehicle:</span> {bid.vehicle_category_name}</p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Car hire:</span> <BidAmount amount={bid.car_hire_price} bidCurrency={bid.currency??"EUR"} customerCurrency={currency} rates={rates} /></p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Fuel deposit:</span> <BidAmount amount={bid.fuel_price} bidCurrency={bid.currency??"EUR"} customerCurrency={currency} rates={rates} /></p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Total:</span> <BidAmount amount={bid.total_price} bidCurrency={bid.currency??"EUR"} customerCurrency={currency} rates={rates} /></p>
          <p className="text-sm font-semibold text-black"><span className="font-black">Insurance included:</span> {bid.full_insurance_included?"Yes":"No"}</p>
          {bid.notes && <p className="text-sm font-semibold text-black"><span className="font-black">Notes:</span> {bid.notes}</p>}
        </div>
        <div className="shrink-0">
          {bid.status==="accepted"
            ? <span className="bg-green-100 px-4 py-2 text-sm font-black text-green-800">Accepted</span>
            : requestStatus==="confirmed"
            ? <span className="bg-[#f0f0f0] px-4 py-2 text-sm font-black text-black/40">Closed</span>
            : <button type="button" onClick={()=>onAccept(bid.id)} disabled={!!acceptingId||expired}
                className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                {acceptingId===bid.id?"Accepting…":"Accept Bid"}
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
  const [liveRates,        setLiveRates]        = useState<Rates>(hookRates ?? { GBP: 0.85, USD: 1.08 });
  const [requestId,        setRequestId]        = useState("");
  const [authChecked,      setAuthChecked]      = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [acceptingId,      setAcceptingId]      = useState<string | null>(null);
  const [savingConfirm,    setSavingConfirm]    = useState<ConfirmSection | "insurance" | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [ok,               setOk]              = useState<string | null>(null);
  const [data,             setData]             = useState<ResponseShape | null>(null);
  const [timeLabel,        setTimeLabel]        = useState("—");
  const [expired,          setExpired]          = useState(false);
  const [collectionNotes,  setCollectionNotes]  = useState("");
  const [returnNotes,      setReturnNotes]      = useState("");
  const [insuranceChecked, setInsuranceChecked] = useState(false);
  const [accessToken,      setAccessToken]      = useState("");

  useEffect(() => { params.then(r => setRequestId(r.id)); }, [params]);

  useEffect(() => {
    if (!requestId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace(`/login?next=/bookings/${requestId}`); }
      else { setAuthChecked(true); }
    });
  }, [requestId, supabase, router]);

  useEffect(() => {
    fetch("/api/currency/rate",{cache:"no-store"}).then(r=>r.json()).then(({rates})=>{
      setLiveRates({GBP:Number(rates?.GBP)||0.85,USD:Number(rates?.USD)||1.08});
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
  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full bg-black px-6 py-16"><p className="mx-auto max-w-6xl text-white/50 font-semibold">Loading…</p></div>
    </div>
  );
  if (!data?.request) return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full bg-black px-6 py-16"><p className="mx-auto max-w-6xl text-white/50 font-semibold">{error||"Booking not found"}</p></div>
    </div>
  );

  const bk = data.booking;
  const bkCurr: Currency = bk?.currency ?? "EUR";
  const collectionLocked = !!bk?.collection_confirmed_by_driver && !!bk?.collection_confirmed_by_customer && normalizeFuel(bk.collection_fuel_level_driver)===normalizeFuel(bk.collection_fuel_level_customer);
  const returnLocked     = !!bk?.return_confirmed_by_driver && !!bk?.return_confirmed_by_customer && normalizeFuel(bk.return_fuel_level_driver)===normalizeFuel(bk.return_fuel_level_customer);
  const insuranceLocked  = !!bk?.insurance_docs_confirmed_by_driver && !!bk?.insurance_docs_confirmed_by_customer;
  const req = data.request;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">My Bookings</p>
            <h1 className="text-4xl font-black text-white md:text-5xl">Booking #{req.job_number ?? "—"}</h1>
            <p className="mt-3 text-base font-semibold text-white/70">Review your booking and any bids received.</p>
          </div>
          <Link href="/bookings"
            className="border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors self-start mt-1">
            ← My Bookings
          </Link>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-4">

          {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          {ok    && <div className="border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{ok}</div>}

          {/* Bid window */}
          {req.status==="open" && (
            <div className={`px-4 py-3 text-sm font-bold ${expired?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>
              <span className="font-black">Bid window:</span> {timeLabel}
            </div>
          )}

          {/* Booking details */}
          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-5">Booking Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Pickup",        req.pickup_address],
                ["Drop-off",      req.dropoff_address||"—"],
                ["Pickup time",   fmt(req.pickup_at)],
                ["Drop-off time", fmt(req.dropoff_at)],
                ["Duration",      formatDuration(req.journey_duration_minutes)],
                ["Passengers",    req.passengers],
                ["Suitcases",     req.suitcases],
                ["Sport equipment", sportEquipmentLabel(req.sport_equipment)],
                ["Vehicle",       req.vehicle_category_name||"—"],
                ["Status",        req.status],
              ].map(([l,v])=>(
                <p key={String(l)} className="text-sm font-semibold text-black">
                  <span className="font-black">{l}:</span> {String(v)}
                </p>
              ))}
              {req.notes && (
                <p className="text-sm font-semibold text-black sm:col-span-2">
                  <span className="font-black">Notes:</span> {req.notes}
                </p>
              )}
            </div>
          </div>

          {/* Confirmed booking */}
          {bk && (
            <>
              <div className="bg-white p-6 border-l-4 border-green-500">
                <p className="text-xs font-black uppercase tracking-widest text-black mb-5">Your Confirmed Booking</p>
                <div className="grid gap-3 sm:grid-cols-2 mb-5">
                  {[
                    ["Status",        bookingStatusLabel(bk.booking_status)],
                    ["Car hire company", bk.company_name||"—"],
                    ["Company phone", bk.company_phone||"—"],
                    ["Driver",        bk.driver_name||"—"],
                    ["Driver phone",  bk.driver_phone||"—"],
                    ["Vehicle",       bk.driver_vehicle||"—"],
                  ].map(([l,v])=>(
                    <p key={String(l)} className="text-sm font-semibold text-black">
                      <span className="font-black">{l}:</span> {String(v)}
                    </p>
                  ))}
                </div>
                {/* Price breakdown */}
                <div className="bg-[#f0f0f0] p-4 space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Price Breakdown</p>
                  <div className="flex justify-between text-sm font-semibold text-black">
                    <span>Car hire</span>
                    <span><BookingAmount amount={bk.car_hire_price} storedCurrency={bkCurr} customerCurrency={currency} rates={liveRates} /></span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-black">
                    <span>Full tank deposit <span className="text-black/40">(refundable)</span></span>
                    <span><BookingAmount amount={bk.fuel_price} storedCurrency={bkCurr} customerCurrency={currency} rates={liveRates} /></span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-black border-t border-black/10 pt-2">
                    <span>Total paid</span>
                    <span><BookingAmount amount={bk.amount} storedCurrency={bkCurr} customerCurrency={currency} rates={liveRates} /></span>
                  </div>
                </div>
                {/* WhatsApp */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {bk.company_phone && <a href={`https://wa.me/${bk.company_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 px-4 py-2 text-xs font-black text-white hover:bg-green-600">💬 WhatsApp Car Hire Company</a>}
                  {bk.driver_phone  && <a href={`https://wa.me/${bk.driver_phone.replace(/\D/g,"")}`}  target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 px-4 py-2 text-xs font-black text-white hover:bg-green-600">💬 WhatsApp Driver</a>}
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
                <div className="grid gap-4 xl:grid-cols-2">
                  <FuelConfirmCard title="Delivery Fuel" driverConfirmed={bk.collection_confirmed_by_driver} driverFuel={bk.collection_fuel_level_driver} driverConfirmedAt={bk.collection_confirmed_by_driver_at} customerConfirmed={bk.collection_confirmed_by_customer} customerConfirmedAt={bk.collection_confirmed_by_customer_at} locked={collectionLocked} notes={collectionNotes} onNotesChange={setCollectionNotes} onConfirm={()=>saveConfirmation("collection",true)} onUnconfirm={()=>saveConfirmation("collection",false)} saving={savingConfirm==="collection"} />
                  <FuelConfirmCard title="Collection Fuel" driverConfirmed={bk.return_confirmed_by_driver} driverFuel={bk.return_fuel_level_driver} driverConfirmedAt={bk.return_confirmed_by_driver_at} customerConfirmed={bk.return_confirmed_by_customer} customerConfirmedAt={bk.return_confirmed_by_customer_at} locked={returnLocked} notes={returnNotes} onNotesChange={setReturnNotes} onConfirm={()=>saveConfirmation("return",true)} onUnconfirm={()=>saveConfirmation("return",false)} saving={savingConfirm==="return"} />
                </div>
              )}
            </>
          )}

          {/* Bids */}
          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-5">
              {bk ? "Accepted Bid" : "Car Hire Company Bids"}
            </p>
            {expired||req.status==="expired" ? (
              <p className="text-sm font-semibold text-red-600">This request has expired.</p>
            ) : data.bids.length===0 ? (
              <p className="text-sm font-semibold text-black/50">No bids yet — car hire companies in your area will be notified shortly.</p>
            ) : (
              <div className="space-y-3">
                {data.bids.map(bid=>(
                  <BidCard key={bid.id} bid={bid} currency={currency} rates={liveRates} requestStatus={req.status} acceptingId={acceptingId} expired={expired} onAccept={acceptBid} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}