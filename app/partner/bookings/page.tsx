"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; currency: "EUR" | "GBP" | "USD" | null;
  notes: string | null; created_at: string; job_number: number | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  partner_company_name: string | null; partner_company_phone: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  vehicle_category_name: string | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  request_status: string | null;
};

type ApiResponse = { data: BookingRow[]; role: string | null; adminMode: boolean };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "driver_assigned", label: "Driver Assigned" },
  { value: "collected", label: "On Hire" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function fmtDuration(m?: number | null) {
  if (!m) return "—";
  const mpd = 24 * 60;
  if (m >= mpd) { const d = Math.ceil(m/mpd); return `${d} day${d===1?"":"s"}`; }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), mins = m%60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function fmtAmount(amount: number | null, currency: "EUR" | "GBP" | "USD" | null) {
  if (amount == null || isNaN(amount)) return "—";
  const curr = currency ?? "EUR";
  const locale = curr === "EUR" ? "es-ES" : curr === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(amount);
}

function statusPill(status?: string | null) {
  const map: Record<string, string> = {
    confirmed: "border-green-200 bg-green-50 text-green-700",
    driver_assigned: "border-amber-200 bg-amber-50 text-amber-700",
    en_route: "border-indigo-200 bg-indigo-50 text-indigo-700",
    arrived: "border-purple-200 bg-purple-50 text-purple-700",
    collected: "border-blue-200 bg-blue-50 text-blue-700",
    returned: "border-blue-200 bg-blue-50 text-blue-700",
    completed: "border-green-200 bg-green-50 text-green-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
  };
  return map[status ?? ""] ?? "border-black/10 bg-white text-slate-700";
}

function fmtStatus(s?: string | null) {
  switch (String(s||"").toLowerCase()) {
    case "collected": case "returned": return "On Hire";
    case "driver_assigned": return "Driver assigned";
    case "en_route": return "En route";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s||"—").replaceAll("_"," ");
  }
}

function norm(v: unknown) { return String(v || "").toLowerCase().trim(); }

export default function PartnerBookingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load.");
      setRows(json?.data || []);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) { setError(e?.message || "Failed to load."); setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const q = norm(search);
  const filtered = useMemo(() => rows.filter(row => {
    if (filter !== "all" && row.booking_status !== filter) return false;
    if (!q) return true;
    return [row.job_number, row.partner_company_name, row.customer_name, row.driver_name,
      row.pickup_address, row.dropoff_address, row.vehicle_category_name, row.booking_status]
      .map(norm).join(" ").includes(q);
  }), [rows, filter, q]);

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#003768]">Bookings</h1>
            <p className="mt-2 text-slate-600">
              {adminMode ? "All bookings across the network." : "Bookings assigned to your partner account. Click any row to view detail."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search job, customer, driver..."
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]">
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); }}
              className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
              Clear
            </button>
            <button type="button" onClick={load}
              className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <p className="mt-6 text-slate-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-slate-600">No bookings found.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job No.</th>
                  {adminMode && <th className="px-4 py-3 font-semibold">Partner</th>}
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map(row => (
                  <tr key={row.id}
                    onClick={() => router.push(`/partner/bookings/${row.id}`)}
                    className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
                    <td className="px-4 py-4 font-bold text-[#003768]">{row.job_number ?? "—"}</td>
                    {adminMode && <td className="px-4 py-4 text-slate-700">{row.partner_company_name || "—"}</td>}
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{row.customer_name || "—"}</div>
                      <div className="text-xs text-slate-400">{row.customer_phone || row.customer_email || ""}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(row.booking_status)}`}>
                        {fmtStatus(row.booking_status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{row.driver_name || "—"}</div>
                      <div className="text-xs text-slate-400">{row.driver_vehicle || ""}</div>
                    </td>
                    <td className="px-4 py-4 max-w-[160px] truncate text-slate-700">{row.pickup_address || "—"}</td>
                    <td className="px-4 py-4 max-w-[160px] truncate text-slate-700">{row.dropoff_address || "—"}</td>
                    <td className="px-4 py-4 text-slate-700">{fmt(row.pickup_at)}</td>
                    <td className="px-4 py-4 text-slate-700">{fmtDuration(row.journey_duration_minutes)}</td>
                    <td className="px-4 py-4 text-slate-700">{row.vehicle_category_name || "—"}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {fmtAmount(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{fmt(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}