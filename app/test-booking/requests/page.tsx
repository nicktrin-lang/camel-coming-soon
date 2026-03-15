"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

type RequestRow = {
  id: string;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  vehicle_category_name: string | null;
  status: string;
  created_at: string;
};

export default function TestBookingRequestsPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Not signed in");
      }

      const res = await fetch("/api/test-booking/requests", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load requests");
      }

      setRows(json.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-[#003768]">
            My Test Requests
          </h1>

          <Link
            href="/test-booking/new"
            className="rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            New Test Request
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-slate-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-slate-600">No requests yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-slate-700">
                  <th className="py-3">Created</th>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Pickup Time</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/test-booking/requests/${r.id}`)
                    }
                  >
                    <td className="py-3">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>

                    <td>{r.pickup_address}</td>

                    <td>{r.dropoff_address || "—"}</td>

                    <td>
                      {r.pickup_at
                        ? new Date(r.pickup_at).toLocaleString()
                        : "—"}
                    </td>

                    <td>{r.vehicle_category_name || "—"}</td>

                    <td className="capitalize">{r.status}</td>
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