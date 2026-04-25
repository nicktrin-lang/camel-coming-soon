"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AccountRow = {
  id: string;
  user_id?: string | null;
  email: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  application_status: string | null;
  live_profile: boolean;
  missing?: string[];
  created_at: string | null;
};

type SortKey =
  | "created_desc" | "created_asc"
  | "company_asc"  | "company_desc"
  | "contact_asc"  | "contact_desc"
  | "status_asc"   | "status_desc"
  | "live_desc"    | "live_asc";

const PAGE_SIZE = 10;

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function statusPillClasses(status?: string | null) {
  switch (normalizeText(status)) {
    case "approved": return "border-green-200 bg-green-50 text-green-700";
    case "pending":  return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-black/10 bg-white text-black/60";
  }
}

function statusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function missingLabel(key: string) {
  const map: Record<string, string> = {
    service_radius_km: "Service radius",
    base_address:      "Base address",
    base_location:     "Base location (lat/lng)",
    fleet:             "Fleet vehicle",
    driver:            "Driver",
    default_currency:  "Billing currency",
  };
  return map[key] ?? key;
}

export default function AdminAccountsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [rows,         setRows]         = useState<AccountRow[]>([]);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState<SortKey>("created_desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const stats = useMemo(() => ({
    total:    rows.length,
    approved: rows.filter(r => r.application_status === "approved").length,
    pending:  rows.filter(r => r.application_status === "pending").length,
    live:     rows.filter(r => r.live_profile).length,
  }), [rows]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes  = await fetch("/api/admin/is-admin", { cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const res  = await fetch("/api/admin/accounts", { cache: "no-store", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to load accounts.");
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load accounts.");
      setRows([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, sortBy]);

  const searchValue = normalizeText(search);

  const filteredRows = useMemo(() => rows.filter(row => {
    if (!searchValue) return true;
    return [row.company_name, row.contact_name, row.email, row.phone, row.application_status,
      row.live_profile ? "yes live true" : "no not live false"]
      .map(normalizeText).join(" ").includes(searchValue);
  }), [rows, searchValue]);

  const sortedRows = useMemo(() => {
    const data = [...filteredRows];
    data.sort((a, b) => {
      const aT = new Date(a.created_at || 0).getTime();
      const bT = new Date(b.created_at || 0).getTime();
      switch (sortBy) {
        case "created_asc":  return aT - bT;
        case "created_desc": return bT - aT;
        case "company_asc":  return normalizeText(a.company_name).localeCompare(normalizeText(b.company_name));
        case "company_desc": return normalizeText(b.company_name).localeCompare(normalizeText(a.company_name));
        case "contact_asc":  return normalizeText(a.contact_name).localeCompare(normalizeText(b.contact_name));
        case "contact_desc": return normalizeText(b.contact_name).localeCompare(normalizeText(a.contact_name));
        case "status_asc":   return normalizeText(a.application_status).localeCompare(normalizeText(b.application_status));
        case "status_desc":  return normalizeText(b.application_status).localeCompare(normalizeText(a.application_status));
        case "live_asc":     return Number(a.live_profile) - Number(b.live_profile);
        case "live_desc":    return Number(b.live_profile) - Number(a.live_profile);
        default:             return bT - aT;
      }
    });
    return data;
  }, [filteredRows, sortBy]);

  const visible = sortedRows.slice(0, visibleCount);
  const hasMore = sortedRows.length > visibleCount;

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Accounts", value: stats.total,    color: "text-black" },
          { label: "Approved",       value: stats.approved, color: "text-black" },
          { label: "Pending",        value: stats.pending,  color: "text-[#ff7a00]" },
          { label: "Live Profile",   value: stats.live,     color: "text-black" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-4">
          <h1 className="text-2xl font-black text-black">Account Management</h1>
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:max-w-[760px]">
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search company, contact, email, phone..."
                className="mt-1 w-full border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Sort by</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
                className="mt-1 w-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-black">
                <option value="created_desc">Newest created</option>
                <option value="created_asc">Oldest created</option>
                <option value="company_asc">Company A–Z</option>
                <option value="company_desc">Company Z–A</option>
                <option value="contact_asc">Contact A–Z</option>
                <option value="contact_desc">Contact Z–A</option>
                <option value="status_asc">Status A–Z</option>
                <option value="status_desc">Status Z–A</option>
                <option value="live_desc">Live profile first</option>
                <option value="live_asc">Non-live first</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button type="button" onClick={() => { setSearch(""); setSortBy("created_desc"); }}
            className="border border-black/20 px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
            Clear Filters
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {searchValue && (
          <div className="mb-4 border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold text-black">
            Showing results for: <span className="font-black">{search}</span>
          </div>
        )}

        <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-3">
          Showing <span className="text-black">{Math.min(visibleCount, sortedRows.length)}</span> of <span className="text-black">{sortedRows.length}</span> accounts
        </p>

        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Created","Company","Contact","Email","Phone","Status","Live Profile","Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td className="px-4 py-4 text-sm font-bold text-black/50" colSpan={8}>Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td className="px-4 py-4 text-sm font-bold text-black/50" colSpan={8}>
                  {searchValue ? "No partner accounts match this search." : "No partner accounts found."}
                </td></tr>
              ) : visible.map((row, i) => (
                <tr key={row.id} className={`align-top hover:bg-[#f0f0f0] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-bold text-black/50 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3 font-black text-black">{row.company_name || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.contact_name || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.email || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex border px-2 py-0.5 text-xs font-black capitalize ${statusPillClasses(row.application_status)}`}>
                      {statusLabel(row.application_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.live_profile ? (
                      <span className="inline-flex border border-black/20 bg-black px-2 py-0.5 text-xs font-black text-white">
                        ✓ Live
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">
                          Not live
                        </span>
                        {row.missing && row.missing.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {row.missing.map(m => (
                              <li key={m} className="text-[11px] font-bold text-black/40">· {missingLabel(m)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/accounts/${row.id}`}
                      className="inline-flex bg-[#ff7a00] px-4 py-2 text-xs font-black text-white hover:opacity-90 transition-opacity">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <button type="button" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
            ▼ Show more ({sortedRows.length - visibleCount} remaining)
          </button>
        )}
        {visibleCount > PAGE_SIZE && !hasMore && (
          <button type="button" onClick={() => setVisibleCount(PAGE_SIZE)}
            className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
            ▲ Show less
          </button>
        )}
      </div>
    </div>
  );
}