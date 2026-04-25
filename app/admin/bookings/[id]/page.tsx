"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";
const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "es-ES", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
  USD: { symbol: "$", locale: "en-US", label: "USD" },
};
type Rates = { GBP: number; USD: number };

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  partner_company_name?: string | null;
  booking_status: string; amount: number | null; notes: string | null;
  created_at: string; job_number: number | null; assigned_driver_id?: string | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  fuel_price: number | null; car_hire_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
  currency: Currency;
  collection_confirmed_by_driver?: boolean | null; collection_confirmed_by_driver_at?: string | null;
  collection_fuel_level_driver?: string | null;
  return_confirmed_by_driver?: boolean | null; return_confirmed_by_driver_at?: string | null;
  return_fuel_level_driver?: string | null;
  collection_confirmed_by_partner?: boolean | null; collection_confirmed_by_partner_at?: string | null;
  collection_fuel_level_partner?: string | null; collection_partner_notes?: string | null;
  return_confirmed_by_partner?: boolean | null; return_confirmed_by_partner_at?: string | null;
  return_fuel_level_partner?: string | null; return_partner_notes?: string | null;
  collection_confirmed_by_customer?: boolean | null; collection_confirmed_by_customer_at?: string | null;
  collection_fuel_level_customer?: string | null; collection_customer_notes?: string | null;
  return_confirmed_by_customer?: boolean | null; return_confirmed_by_customer_at?: string | null;
  return_fuel_level_customer?: string | null; return_customer_notes?: string | null;
  insurance_docs_confirmed_by_driver?: boolean | null; insurance_docs_confirmed_by_driver_at?: string | null;
  insurance_docs_confirmed_by_customer?: boolean | null; insurance_docs_confirmed_by_customer_at?: string | null;
  delivery_driver_id?: string | null; delivery_driver_name?: string | null; delivery_confirmed_at?: string | null;
  collection_driver_id?: string | null; collection_driver_name?: string | null; collection_confirmed_at?: string | null;
};

type RequestRow = {
  id: string; job_number: number | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  sport_equipment: string | null;
  vehicle_category_name: string | null; notes: string | null; status: string | null;
};

type ApiResponse = { booking: BookingRow; request: RequestRow | null; role: string | null };

function fmtCurr(amount: number, curr: Currency): string {
  return new Intl.NumberFormat(CURRENCY_META[curr].locale, { style: "currency", currency: curr }).format(amount);
}
function toEur(amount: number, stored: Currency, rates: Rates): number {
  if (stored === "EUR") return amount;
  if (stored === "GBP") return Math.round((amount / rates.GBP) * 100) / 100;
  return Math.round((amount / rates.USD) * 100) / 100;
}
function fromEur(amountEur: number, target: Currency, rates: Rates): number {
  if (target === "EUR") return amountEur;
  if (target === "GBP") return Math.round(amountEur * rates.GBP * 100) / 100;
  return Math.round(amountEur * rates.USD * 100) / 100;
}

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
function FuelBar({ level }: { level: unknown }) {
  const n = normalizeFuel(level);
  const filled = n ? (FUEL_BARS[n] ?? 0) : 0;
  return (
    <div className="flex gap-1 mt-1">
      {[0,1,2,3].map(i => (
        <div key={i} className={`h-2 flex-1 ${i < filled ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400" : "bg-black/10"}`} />
      ))}
    </div>
  );
}
function fmt(v?: string | null) { if (!v) return "—"; try { return new Date(v).toLocaleString(); } catch { return v; } }
function fmtDuration(m?: number | null) {
  if (!m) return "—";
  if (m >= 1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)===1?"":"s"}`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), mins = m%60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}
function statusLabel(s?: string | null) {
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
    golf_single:"Golf clubs — 1 bag", golf_two:"Golf clubs — 2 bags", golf_three:"Golf clubs — 3 bags", golf_four:"Golf clubs — 4+ bags",
    skis_pair:"Skis / snowboard — 1 set", skis_two:"Skis / snowboard — 2 sets", skis_three:"Skis / snowboard — 3+ sets",
    bikes_one:"Bikes — 1", bikes_two:"Bikes — 2", bikes_three:"Bikes — 3+", other:"Other large equipment",
  };
  return map[v] || v;
}

const QUARTER_LABELS: Record<number, string> = { 0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
      <p className="mt-0.5 text-sm text-black">{value ?? "—"}</p>
    </div>
  );
}

function ConfirmRow({ label, confirmed, fuel, confirmedAt, notes }: {
  label: string; confirmed: boolean | null | undefined;
  fuel: string | null | undefined; confirmedAt: string | null | undefined; notes?: string | null;
}) {
  return (
    <div className={`border p-4 ${confirmed ? "border-black bg-black text-white" : "border-black/10 bg-[#f0f0f0]"}`}>
      <p className={`text-xs font-black uppercase tracking-widest ${confirmed ? "text-white/50" : "text-black/50"}`}>{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className={`text-sm font-black ${confirmed ? "text-[#ff7a00]" : "text-black/40"}`}>
          {confirmed ? "✓ Confirmed" : "Pending"}
        </span>
        {confirmed && fuel && <span className={`text-sm ${confirmed ? "text-white" : "text-black"}`}>{fuelLabel(fuel)}</span>}
      </div>
      {confirmed && fuel && <FuelBar level={fuel} />}
      {confirmed && confirmedAt && <p className={`mt-1 text-xs ${confirmed ? "text-white/50" : "text-black/40"}`}>{fmt(confirmedAt)}</p>}
      {notes && <p className={`mt-1 text-xs ${confirmed ? "text-white/70" : "text-black/60"}`}>Note: {notes}</p>}
    </div>
  );
}

function BookingSummaryCard({ booking, rates, isLive }: { booking: BookingRow; rates: Rates; isLive: boolean }) {
  const stored: Currency = booking.currency ?? "EUR";
  const sec1: Currency   = stored === "USD" ? "EUR" : stored === "GBP" ? "EUR" : "GBP";
  const sec2: Currency   = stored === "EUR" ? "USD" : stored === "GBP" ? "USD" : "GBP";
  const carHireAmt   = Number(booking.car_hire_price || 0);
  const fullTankAmt  = Number(booking.fuel_price || 0);
  const totalAmt     = Number(booking.amount || 0);
  const fuelCharge   = booking.fuel_charge ?? null;
  const fuelRefund   = booking.fuel_refund ?? null;
  const perQtrAmt    = fullTankAmt / 4;
  const usedQuarters = booking.fuel_used_quarters ?? null;
  const collFuel = normalizeFuel(booking.collection_fuel_level_partner) || normalizeFuel(booking.collection_fuel_level_driver) || normalizeFuel(booking.collection_fuel_level_customer);
  const retFuel  = normalizeFuel(booking.return_fuel_level_partner)     || normalizeFuel(booking.return_fuel_level_driver)     || normalizeFuel(booking.return_fuel_level_customer);
  const primary  = (v: number) => fmtCurr(v, stored);
  const sec      = (v: number) => { const inEur = toEur(v, stored, rates); return `(${fmtCurr(fromEur(inEur, sec1, rates), sec1)} · ${fmtCurr(fromEur(inEur, sec2, rates), sec2)})`; };
  const rateBadge = `1€ = ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(rates.GBP)} · 1€ = ${new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(rates.USD)}`;

  return (
    <div className="border border-black bg-[#1a1a1a] p-8 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-widest">Booking Summary</h2>
        <span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">Finalised</span>
      </div>
      <div className="mt-4 border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-black uppercase tracking-widest text-white/50">Total booking value</p>
        <p className="mt-1 text-4xl font-black">{primary(totalAmt)} <span className="text-xl font-black opacity-50">{sec(totalAmt)}</span></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/50">Car hire</p>
            <p className="mt-0.5 font-black">{primary(carHireAmt)}</p>
            <p className="text-xs text-white/40">{sec(carHireAmt)}</p>
          </div>
          <div className="border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/50">Full tank deposit</p>
            <p className="mt-0.5 font-black">{primary(fullTankAmt)}</p>
            <p className="text-xs text-white/40">{sec(fullTankAmt)}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {label:"Delivery fuel",value:fuelLabel(collFuel),bar:collFuel},
          {label:"Collection fuel",value:fuelLabel(retFuel),bar:retFuel},
          {label:"Fuel used",value:usedQuarters!==null?QUARTER_LABELS[usedQuarters]??`${usedQuarters}/4`:"—",bar:null},
          {label:"Per quarter",value:primary(perQtrAmt),bar:null},
        ].map(({label,value,bar})=>(
          <div key={label} className="border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/50">{label}</p>
            <p className="mt-1 text-xl font-black">{value}</p>
            {bar && <FuelBar level={bar}/>}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="border border-[#ff7a00]/40 bg-[#ff7a00]/10 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">Fuel charge to customer</p>
          <p className="mt-2 text-3xl font-black text-[#ff7a00]">
            {fuelCharge != null ? primary(fuelCharge) : "—"}
            {fuelCharge != null && <span className="ml-2 text-lg font-black opacity-50">{sec(fuelCharge)}</span>}
          </p>
          <p className="mt-1 text-sm text-white/50">For {usedQuarters ?? "—"} quarter{usedQuarters !== 1 ? "s" : ""} used</p>
        </div>
        <div className="border border-green-500/40 bg-green-500/10 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">Refund to customer</p>
          <p className="mt-2 text-3xl font-black text-green-400">
            {fuelRefund != null ? primary(fuelRefund) : "—"}
            {fuelRefund != null && <span className="ml-2 text-lg font-black opacity-50">{sec(fuelRefund)}</span>}
          </p>
          <p className="mt-1 text-sm text-white/50">Unused fuel portion returned</p>
        </div>
      </div>
      <div className={`mt-5 inline-flex items-center gap-2 border px-4 py-2 text-xs font-black uppercase tracking-widest ${isLive ? "border-[#ff7a00]/40 text-[#ff7a00]" : "border-white/10 text-white/40"}`}>
        <span className={`h-2 w-2 ${isLive ? "bg-[#ff7a00]" : "bg-white/20"}`} />
        {rateBadge}{isLive ? " · Live rate" : ""}
      </div>
    </div>
  );
}

export default function AdminBookingDetailPage() {
  const params    = useParams<{ id: string }>();
  const bookingId = String(params?.id || "");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string|null>(null);
  const [data,       setData]       = useState<ApiResponse|null>(null);
  const [rates,      setRates]      = useState<Rates>({ GBP: 0.85, USD: 1.08 });
  const [rateIsLive, setRateIsLive] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/bookings/${bookingId}`, { cache: "no-store", credentials: "include" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to load booking.");
        setData(json);
      } catch(e: any) { setError(e?.message || "Failed to load booking."); }
      finally { setLoading(false); }
    }
    async function loadRates() {
      try {
        const res = await fetch("/api/currency/rate", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (json?.rates) { setRates({ GBP: Number(json.rates.GBP)||0.85, USD: Number(json.rates.USD)||1.08 }); setRateIsLive(!!json.live); }
      } catch {}
    }
    load(); loadRates();
  }, [bookingId]);

  if (loading) return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="border border-black/10 bg-white p-8"><p className="text-black/50">Loading booking…</p></div>
    </div>
  );
  if (!data?.booking) return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="border border-red-200 bg-red-50 p-6 text-red-700">{error || "Booking not found"}</div>
    </div>
  );

  const bk  = data.booking;
  const req = data.request;
  const collEffective    = normalizeFuel(bk.collection_fuel_level_partner) || normalizeFuel(bk.collection_fuel_level_driver);
  const retEffective     = normalizeFuel(bk.return_fuel_level_partner) || normalizeFuel(bk.return_fuel_level_driver);
  const collectionLocked = !!collEffective && !!bk.collection_confirmed_by_customer && normalizeFuel(bk.collection_fuel_level_customer) === collEffective;
  const returnLocked     = !!retEffective && !!bk.return_confirmed_by_customer && normalizeFuel(bk.return_fuel_level_customer) === retEffective;
  const insuranceBothConfirmed = !!bk.insurance_docs_confirmed_by_driver && !!bk.insurance_docs_confirmed_by_customer;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Booking Detail</h1>
          {bk.job_number && <p className="mt-1 text-sm text-black/50">Job #{bk.job_number}</p>}
        </div>
        <Link href="/admin/bookings"
          className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">
          ← Back to Bookings
        </Link>
      </div>

      {/* Booking + Journey info */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border border-black/10 bg-white p-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-black">Booking Information</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Job No." value={String(bk.job_number ?? req?.job_number ?? "—")} />
            <Field label="Status" value={statusLabel(bk.booking_status)} />
            <Field label="Partner" value={bk.partner_company_name} />
            <Field label="Currency" value={bk.currency ?? "EUR"} />
            <Field label="Created" value={fmt(bk.created_at)} />
            <Field label="Driver" value={bk.driver_name} />
            <Field label="Driver phone" value={bk.driver_phone} />
            <Field label="Driver vehicle" value={bk.driver_vehicle} />
            <Field label="Driver assigned" value={fmt(bk.driver_assigned_at)} />
            <Field label="Notes" value={bk.notes} />
          </div>
        </div>

        <div className="border border-black/10 bg-white p-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-black">Journey Information</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Customer" value={req?.customer_name} />
            <Field label="Email" value={req?.customer_email} />
            <Field label="Phone" value={req?.customer_phone} />
            <Field label="Pickup" value={req?.pickup_address} />
            <Field label="Dropoff" value={req?.dropoff_address} />
            <Field label="Pickup time" value={fmt(req?.pickup_at)} />
            <Field label="Dropoff time" value={fmt(req?.dropoff_at)} />
            <Field label="Duration" value={fmtDuration(req?.journey_duration_minutes)} />
            <Field label="Passengers" value={String(req?.passengers ?? "—")} />
            <Field label="Suitcases" value={String(req?.suitcases ?? "—")} />
            <Field label="Sport equipment" value={sportEquipmentLabel(req?.sport_equipment ?? null)} />
            <Field label="Vehicle" value={req?.vehicle_category_name} />
            {req?.notes && <Field label="Notes" value={req.notes} />}
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <BookingSummaryCard booking={bk} rates={rates} isLive={rateIsLive} />

      {/* Driver Audit Trail */}
      <div className="border border-black/10 bg-white p-8">
        <h2 className="text-xl font-black uppercase tracking-widest text-black">Driver Audit Trail</h2>
        <p className="mt-1 mb-5 text-sm text-black/50">Permanently stamped when each driver confirms via their app — never editable.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`border p-5 ${bk.delivery_driver_name ? "border-black bg-black text-white" : "border-black/10 bg-[#f0f0f0]"}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${bk.delivery_driver_name ? "text-white/50" : "text-black/50"}`}>🚗 Delivery driver</p>
            {bk.delivery_driver_name ? (
              <>
                <p className="mt-2 text-lg font-black text-[#ff7a00]">{bk.delivery_driver_name}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-white/50">Delivered at</p>
                <p className="text-sm text-white">{fmt(bk.delivery_confirmed_at)}</p>
                {bk.delivery_driver_id !== bk.assigned_driver_id && (
                  <p className="mt-2 text-xs font-black text-[#ff7a00]">⚠ Different driver to current assignment</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-black/40">Not yet delivered</p>
            )}
          </div>
          <div className={`border p-5 ${bk.collection_driver_name ? "border-black bg-black text-white" : "border-black/10 bg-[#f0f0f0]"}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${bk.collection_driver_name ? "text-white/50" : "text-black/50"}`}>🏁 Collection driver</p>
            {bk.collection_driver_name ? (
              <>
                <p className="mt-2 text-lg font-black text-[#ff7a00]">{bk.collection_driver_name}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-white/50">Collected at</p>
                <p className="text-sm text-white">{fmt(bk.collection_confirmed_at)}</p>
                {bk.delivery_driver_id && bk.collection_driver_id && bk.delivery_driver_id !== bk.collection_driver_id && (
                  <p className="mt-2 text-xs font-black text-[#ff7a00]">⚠ Different driver to delivery</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-black/40">Not yet collected</p>
            )}
          </div>
        </div>
        {bk.delivery_driver_id && bk.collection_driver_id && bk.delivery_driver_id !== bk.collection_driver_id && (
          <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Different drivers handled delivery and collection on this booking.
          </div>
        )}
      </div>

      {/* Insurance */}
      <div className="border border-black/10 bg-white p-8">
        <h2 className="text-xl font-black uppercase tracking-widest text-black">Insurance Documents</h2>
        <p className="mt-1 mb-5 text-sm text-black/50">Driver confirms handover at delivery. Customer confirms receipt.</p>
        <div className={`border p-6 ${insuranceBothConfirmed ? "border-black bg-black text-white" : "border-black/10 bg-[#f0f0f0]"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <h3 className={`text-lg font-black uppercase tracking-widest ${insuranceBothConfirmed ? "text-white" : "text-black"}`}>Insurance Documents</h3>
            </div>
            {insuranceBothConfirmed && (
              <span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">✓ Confirmed</span>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={`border p-4 ${bk.insurance_docs_confirmed_by_driver ? "border-[#ff7a00]/40 bg-[#ff7a00]/10" : "border-black/10 bg-white/10"}`}>
              <p className={`text-xs font-black uppercase tracking-widest ${insuranceBothConfirmed ? "text-white/50" : "text-black/50"}`}>Driver</p>
              {bk.insurance_docs_confirmed_by_driver ? (
                <>
                  <p className="mt-1 text-base font-black text-[#ff7a00]">✓ Handed over</p>
                  <p className={`mt-0.5 text-xs ${insuranceBothConfirmed ? "text-white/40" : "text-black/40"}`}>{fmt(bk.insurance_docs_confirmed_by_driver_at)}</p>
                </>
              ) : (
                <p className={`mt-1 text-sm ${insuranceBothConfirmed ? "text-white/40" : "text-black/40"}`}>Not yet confirmed</p>
              )}
            </div>
            <div className={`border p-4 ${bk.insurance_docs_confirmed_by_customer ? "border-green-400/40 bg-green-400/10" : "border-black/10 bg-white/10"}`}>
              <p className={`text-xs font-black uppercase tracking-widest ${insuranceBothConfirmed ? "text-white/50" : "text-black/50"}`}>Customer</p>
              {bk.insurance_docs_confirmed_by_customer ? (
                <>
                  <p className="mt-1 text-base font-black text-green-400">✓ Received</p>
                  <p className={`mt-0.5 text-xs ${insuranceBothConfirmed ? "text-white/40" : "text-black/40"}`}>{fmt(bk.insurance_docs_confirmed_by_customer_at)}</p>
                </>
              ) : (
                <p className={`mt-1 text-sm ${insuranceBothConfirmed ? "text-white/40" : "text-black/40"}`}>Not yet confirmed</p>
              )}
            </div>
          </div>
          <div className={`mt-4 border p-3 text-sm font-black ${insuranceBothConfirmed ? "border-[#ff7a00]/30 text-[#ff7a00]" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            {insuranceBothConfirmed
              ? "✓ Both driver and customer confirm insurance documents were handed over at delivery."
              : !bk.insurance_docs_confirmed_by_driver && !bk.insurance_docs_confirmed_by_customer
              ? "Awaiting confirmation from driver and customer."
              : !bk.insurance_docs_confirmed_by_driver
              ? "Awaiting driver confirmation."
              : "Awaiting customer confirmation."}
          </div>
        </div>
      </div>

      {/* Fuel Tracking */}
      <div className="border border-black/10 bg-white p-8">
        <h2 className="text-xl font-black uppercase tracking-widest text-black">Fuel Tracking</h2>
        <p className="mt-1 mb-5 text-sm text-black/50">Full confirmation trail from driver, partner office, and customer.</p>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className={`border p-5 ${collectionLocked ? "border-black bg-[#1a1a1a]" : "border-black/10"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-black uppercase tracking-widest ${collectionLocked ? "text-white" : "text-black"}`}>Delivery</h3>
              {collectionLocked && <span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">✓ Locked</span>}
            </div>
            <div className="space-y-3">
              <ConfirmRow label="Driver" confirmed={!!bk.collection_confirmed_by_driver} fuel={bk.collection_fuel_level_driver} confirmedAt={bk.collection_confirmed_by_driver_at} />
              <ConfirmRow label="Partner office" confirmed={!!bk.collection_confirmed_by_partner} fuel={bk.collection_fuel_level_partner} confirmedAt={bk.collection_confirmed_by_partner_at} notes={bk.collection_partner_notes} />
              <ConfirmRow label="Customer" confirmed={!!bk.collection_confirmed_by_customer} fuel={bk.collection_fuel_level_customer} confirmedAt={bk.collection_confirmed_by_customer_at} notes={bk.collection_customer_notes} />
            </div>
          </div>
          <div className={`border p-5 ${returnLocked ? "border-black bg-[#1a1a1a]" : "border-black/10"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-black uppercase tracking-widest ${returnLocked ? "text-white" : "text-black"}`}>Collection</h3>
              {returnLocked && <span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">✓ Locked</span>}
            </div>
            <div className="space-y-3">
              <ConfirmRow label="Driver" confirmed={!!bk.return_confirmed_by_driver} fuel={bk.return_fuel_level_driver} confirmedAt={bk.return_confirmed_by_driver_at} />
              <ConfirmRow label="Partner office" confirmed={!!bk.return_confirmed_by_partner} fuel={bk.return_fuel_level_partner} confirmedAt={bk.return_confirmed_by_partner_at} notes={bk.return_partner_notes} />
              <ConfirmRow label="Customer" confirmed={!!bk.return_confirmed_by_customer} fuel={bk.return_fuel_level_customer} confirmedAt={bk.return_confirmed_by_customer_at} notes={bk.return_customer_notes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}