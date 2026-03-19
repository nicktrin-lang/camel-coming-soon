"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AccountRow = {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string;
  address: string;
  website: string;
  role: string;
  status: string;
  created_at: string | null;
  user_id: string | null;
  has_profile: boolean;
  service_radius_km: number | null;
  base_address: string;
  fleet_count: number;
  is_live_profile: boolean;
  live_profile_reason: string;
};

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
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function AdminAccountsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        router.replace("/partner/login");
        return;
      }

      const res = await fetch("/api/admin/accounts", {
        credentials: "include",
        cache: "no-store",
      });

      const json = await safeJson(res);

      if (!res.ok) throw new Error("Failed");

      setRows(json.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 🔥 STATS CALCULATION
  const total = rows.length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const live = rows.filter((r) => r.is_live_profile).length;

  return (
    <div className="space-y-6">

      {/* 🔥 STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Total Partners</p>
          <p className="mt-1 text-2xl font-semibold text-[#003768]">{total}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{approved}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{pending}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Live Profiles</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{live}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Account Management</h2>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-[#003768]">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Live</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4" colSpan={6}>Loading...</td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-4">{row.company_name}</td>
                  <td className="px-4 py-4">{row.contact_name}</td>

                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusPillClasses(row.status)}`}>
                      {row.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {row.is_live_profile ? "✅" : "❌"}
                  </td>

                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/accounts/${row.id}`}
                      className="rounded-full bg-[#ff7a00] px-4 py-2 text-white text-xs font-semibold"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}