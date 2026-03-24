"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type BookingRow = {
  id: string;
  request_id: string | null;
  partner_user_id: string | null;
  partner_company_name: string | null;
  booking_status: string | null;
  amount: number | string | null;
  created_at: string | null;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  vehicle_category_name: string | null;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
    case "confirmed":
    case "completed":
    case "bid_successful":
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
    case "open":
    case "bid_submitted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "rejected":
    case "cancelled":
    case "bid_unsuccessful":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

function formatStatusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function matchesDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return false;

  const itemDate = new Date(value);
  if (Number.isNaN(itemDate.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (itemDate < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999`);
    if (itemDate > toDate) return false;
  }

  return true;
}

export default function AdminBookingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const adminRes = await fetch("/api/admin/is-admin", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const adminJson = await safeJson(adminRes);

      if (!adminJson?.isAdmin) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const bookingsRes = await fetch("/api/partner/bookings", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const bookingsJson = await safeJson(bookingsRes);

      if (!bookingsRes.ok) {
        throw new Error(
          bookingsJson?.error || bookingsJson?._raw || "Failed to load booking data."
        );
      }

      setBookings(Array.isArray(bookingsJson?.data) ? bookingsJson.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setStatusFilter("all");
  }

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBookings = bookings.filter((row) => {
    if (!matchesDateRange(row.created_at, dateFrom, dateTo)) return false;

    if (statusFilter !== "all") {
      const status = String(row.booking_status || "").toLowerCase();
      if (status !== statusFilter) return false;
    }

    if (!normalizedSearch) return true;

    const haystack = [
      row.job_number,
      row.partner_company_name,
      row.pickup_address,
      row.dropoff_address,
      row.vehicle_category_name,
      row.booking_status,
      row.amount,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return haystack.includes(normalizedSearch);
  });

  const bookingStatusOptions = Array.from(
    new Set(
      bookings
        .map((row) => String(row.booking_status || "").toLowerCase())
        .filter(Boolean)
    )
  ).sort();

  const totalBookings = filteredBookings.length;
  const totalRevenue = filteredBookings.reduce((sum, row) => {
    const amount = Number(row.amount || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const completedBookings = filteredBookings.filter(
    (row) => String(row.booking_status || "").toLowerCase() === "completed"
  ).length;

  const confirmedBookings = filteredBookings.filter(
    (row) => String(row.booking_status || "").toLowerCase() === "confirmed"
  ).length;

  const recentBookings = [...filteredBookings]
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">All Bookings</h2>
            <p className="mt-2 text-sm text-slate-600">
              Review all bookings across all partner accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="xl:min-w-[260px]">
              <label className="text-sm font-medium text-[#003768]">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job, partner, address..."
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              >
                <option value="all">All statuses</option>
                {bookingStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Date from</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Date to</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Clear Filters
          </button>

          <button
            type="button"
            onClick={load}
            className="rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Total Bookings</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{totalBookings}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Confirmed Bookings</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{confirmedBookings}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Completed Bookings</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{completedBookings}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="text-sm font-medium text-slate-500">Revenue</div>
        <div className="mt-2 text-3xl font-semibold text-[#003768]">
          {formatCurrency(totalRevenue)}
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#003768]">Recent Bookings</h2>
            <p className="mt-1 text-sm text-slate-600">
              All partner bookings matching your current filters.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">Job Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Partner</th>
                  <th className="px-4 py-3 text-left font-semibold">Pickup</th>
                  <th className="px-4 py-3 text-left font-semibold">Dropoff</th>
                  <th className="px-4 py-3 text-left font-semibold">Pickup At</th>
                  <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={9}>
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((row) => (
                    <tr key={row.id} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 text-slate-700">{formatDateTime(row.created_at)}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {row.job_number || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {row.partner_company_name || "Unknown Partner"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.pickup_address || "—"}</td>
                      <td className="px-4 py-4 text-slate-700">{row.dropoff_address || "—"}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDateTime(row.pickup_at)}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {row.vehicle_category_name || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                            row.booking_status
                          )}`}
                        >
                          {formatStatusLabel(row.booking_status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatCurrency(Number(row.amount || 0))}
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