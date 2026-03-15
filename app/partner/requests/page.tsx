"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  request_id?: string;
  match_status: string;
  matched_fleet_id: string | null;
  created_at: string;
  customer_requests: {
    id: string;
    pickup_address: string;
    dropoff_address: string | null;
    pickup_at: string;
    dropoff_at: string | null;
    journey_duration_minutes: number | null;
    passengers: number;
    suitcases: number;
    hand_luggage: number;
    vehicle_category_slug: string | null;
    vehicle_category_name: string | null;
    notes: string | null;
    status: string;
    created_at: string;
    expires_at: string | null;
  } | null;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function fmtDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function labelMatchStatus(status: string) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return "Open";
  return s.replace(/_/g, " ");
}

export default function PartnerRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/partner/requests", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load requests.");
      }

      setRows((json?.data || []) as RequestRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Booking Requests</h2>
            <p className="mt-2 text-slate-600">
              Open booking requests matched to your fleet and service area.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Dropoff Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Passengers</th>
                  <th className="px-4 py-3 font-semibold">Bags</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-5 text-slate-600">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-5 text-slate-600">
                      No open booking requests yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const req = row.customer_requests;
                    if (!req) return null;

                    const requestId = req.id || row.request_id || "";

                    return (
                      <tr key={row.id} className="hover:bg-black/[0.02]">
                        <td className="px-4 py-4 text-slate-700">
                          {fmtDateTime(req.created_at)}
                        </td>
                        <td className="px-4 py-4 text-slate-900">{req.pickup_address}</td>
                        <td className="px-4 py-4 text-slate-900">
                          {req.dropoff_address || "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {fmtDateTime(req.pickup_at)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {fmtDateTime(req.dropoff_at)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {fmtDuration(req.journey_duration_minutes)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{req.passengers}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {req.suitcases} suitcases / {req.hand_luggage} hand luggage
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {req.vehicle_category_name || "Any suitable vehicle"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-700">
                            {labelMatchStatus(row.match_status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {requestId ? (
                            <Link
                              href={`/partner/requests/${requestId}`}
                              className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                            >
                              View
                            </Link>
                          ) : (
                            <span className="text-xs text-red-600">Missing request id</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Requests shown here should later be filtered by both your fleet capability and service radius.
        </p>
      </div>
    </div>
  );
}