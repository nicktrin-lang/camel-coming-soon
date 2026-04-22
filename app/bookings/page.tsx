"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

type RequestRow = {
  id: string;
  job_number: number | null;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  dropoff_at: string | null;
  vehicle_category_name: string | null;
  status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  open:      "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-blue-200 bg-blue-50 text-blue-700",
  collected: "border-purple-200 bg-purple-50 text-purple-700",
  returned:  "border-purple-200 bg-purple-50 text-purple-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  expired:   "border-slate-200 bg-slate-50 text-slate-500",
};

function statusLabel(s: string) {
  switch (s) {
    case "open":      return "Awaiting bids";
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Confirmed";
    case "collected": case "returned": return "On Hire";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "expired":   return "Expired";
    default: return s.replaceAll("_", " ");
  }
}

export default function BookingsPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router   = useRouter();
  const [rows,    setRows]    = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?next=/bookings"); return; }
      try {
        const res  = await fetch("/api/test-booking/requests", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load bookings.");
        setRows(json.data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, router]);

  const active    = rows.filter(r => ["open","confirmed","driver_assigned","en_route","arrived","collected","returned"].includes(r.status));
  const completed = rows.filter(r => r.status === "completed");
  const other     = rows.filter(r => !["open","confirmed","driver_assigned","en_route","arrived","collected","returned","completed"].includes(r.status));

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="mx-auto max-w-5xl px-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#003768]">My Bookings</h1>
            <p className="mt-1 text-slate-600">Track your car hire requests and bookings.</p>
          </div>
          <Link href="/book"
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 transition-opacity">
            + New Booking
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {[
            { label: "Active",    count: active.length,    color: "bg-blue-500" },
            { label: "Completed", count: completed.length, color: "bg-green-500" },
            { label: "Total",     count: rows.length,      color: "bg-[#003768]" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5">
              <div className={`inline-flex h-2 w-8 rounded-full ${s.color} mb-3`} />
              <p className="text-3xl font-black text-[#003768]">{s.count}</p>
              <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5">
            <p className="text-slate-500">Loading your bookings…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5 text-center">
            <p className="text-4xl mb-4">🚗</p>
            <h2 className="text-xl font-bold text-[#003768] mb-2">No bookings yet</h2>
            <p className="text-slate-500 mb-6">Create your first car hire request and receive bids from local partners.</p>
            <Link href="/book" className="inline-block rounded-full bg-[#ff7a00] px-8 py-3 font-bold text-white hover:opacity-95">
              Book Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { title: "Active", items: active },
              { title: "Completed", items: completed },
              { title: "Other", items: other },
            ].filter(g => g.items.length > 0).map(group => (
              <div key={group.title}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">{group.title}</h2>
                <div className="space-y-3">
                  {group.items.map(r => (
                    <Link key={r.id} href={`/bookings/${r.id}`}
                      className="block rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-[#003768]">#{r.job_number ?? "—"}</span>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status] || STATUS_STYLES.open}`}>
                              {statusLabel(r.status)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 truncate">📍 {r.pickup_address}</p>
                          {r.dropoff_address && <p className="text-sm text-slate-500 truncate">🏁 {r.dropoff_address}</p>}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                            <span>🗓 {r.pickup_at ? new Date(r.pickup_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                            {r.vehicle_category_name && <span>🚗 {r.vehicle_category_name}</span>}
                            <span>Created {new Date(r.created_at).toLocaleDateString("en-GB")}</span>
                          </div>
                        </div>
                        <span className="text-[#003768] text-lg">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}