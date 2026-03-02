"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/**
 * ✅ Matches your Supabase columns screenshot:
 * - pickup_address
 * - pickup_datetime
 * - car_type
 * - notes
 * - created_at
 * (No `car`, no `pickup_time`, no `distance_km` in your table list)
 */
type BookingRequestRow = {
  id: string;
  created_at: string | null;

  pickup_address: string | null;
  car_type: string | null;
  pickup_datetime: string | null;

  notes: string | null;
  status: string | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function PartnerRequestsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user?.id) {
        throw new Error("You are not signed in.");
      }

      /**
       * ✅ Table name: booking_requests
       * ✅ Columns: car_type + pickup_datetime
       */
      const { data, error: qErr } = await supabase
        .from("booking_requests")
        .select(
          "id,created_at,pickup_address,car_type,pickup_datetime,notes,status"
        )
        // Optional: only open requests if you use status
        // .in("status", ["open", "pending"])
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;

      setRows((data || []) as BookingRequestRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load booking requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-9xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
      {/* Header row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#003768]">
            Booking Requests
          </h1>
          <p className="mt-2 text-gray-600">
            Open booking requests within your service radius.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#003768] hover:bg-black/5 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <Link
            href="/partner/dashboard"
            className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-black/10">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-[#f3f8ff]">
              <tr className="text-[#003768]">
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Pickup</th>
                <th className="px-4 py-3 font-semibold">Car</th>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    No open booking requests yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-4 text-gray-700">
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className="px-4 py-4 text-gray-900">
                      {r.pickup_address || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {r.car_type || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {fmtDateTime(r.pickup_datetime)}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {r.notes || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {r.status || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Tip: If you’re expecting to see requests, confirm your base location and
        service radius in Partner Profile.
      </p>
    </div>
  );
}