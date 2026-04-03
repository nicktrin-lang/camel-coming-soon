"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminRequestRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  dropoff_at: string | null;
  journey_duration_minutes: number | null;
  passengers: number;
  suitcases: number;
  hand_luggage: number;
  vehicle_category_name: string | null;
  status: string;
  created_at: string;
  bid_count: number;
  has_accepted_bid: boolean;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function fmtDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const mpd = 24 * 60;
  if (minutes >= mpd) { const d = Math.ceil(minutes/mpd); return `${d} day${d===1?"":"s"}`; }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes/60), m = minutes%60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function statusPillClasses(status: string, hasAccepted: boolean) {
  if (hasAccepted || status === "confirmed" || status === "booked")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "open") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "expired" || status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  return "border-black/10 bg-white text-slate-700";
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load requests.");
      setRows((json?.data || []) as AdminRequestRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const statusOptions = Array.from(new Set(rows.map(r => r.status).filter(Boolean))).sort();

  const filtered = rows.filter(row => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return [row.customer_name, row.pickup_address, row.dropoff_address, row.vehicle_category_name, row.status]
      .map(v => String(v || "").toLowerCase()).join(" ").includes(normalizedSearch);
  });

  const totalOpen = filtered.filter(r => r.status === "open").length;
  const totalConfirmed = filtered.filter(r => r.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Requests</h2>
            <p className="mt-1 text-sm text-slate-600">Review customer requests and partner bids. Click any row to view detail.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div>
              <label className="text-sm font-medium text-[#003768]">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Customer, address…"
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-[#0f4f8a]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-[#0f4f8a]">
                <option value="all">All statuses</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }}
            className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5">
            Clear Filters
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[["Total", filtered.length], ["Open", totalOpen], ["Confirmed", totalConfirmed]].map(([label, value]) => (
          <div key={String(label)} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#003768]">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Pickup</th>
                  <th className="px-4 py-3 text-left font-semibold">Dropoff</th>
                  <th className="px-4 py-3 text-left font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                  <th className="px-4 py-3 text-left font-semibold">Bids</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-5 text-slate-600">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-5 text-slate-600">No requests found.</td></tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}
                      onClick={() => router.push(`/admin/requests/${row.id}`)}
                      className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
                      <td className="px-4 py-4 text-slate-700">{fmtDateTime(row.created_at)}</td>
                      <td className="px-4 py-4 font-semibold text-[#003768]">{row.customer_name || "—"}</td>
                      <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{row.pickup_address}</td>
                      <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{row.dropoff_address || "—"}</td>
                      <td className="px-4 py-4 text-slate-700">{fmtDateTime(row.pickup_at)}</td>
                      <td className="px-4 py-4 text-slate-700">{fmtDuration(row.journey_duration_minutes)}</td>
                      <td className="px-4 py-4 text-slate-700">{row.vehicle_category_name || "Any"}</td>
                      <td className="px-4 py-4 text-slate-700">{row.bid_count}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(row.status, row.has_accepted_bid)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}