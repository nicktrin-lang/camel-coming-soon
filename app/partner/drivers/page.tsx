"use client";

import { useEffect, useState } from "react";

type DriverRow = {
  id: string;
  partner_user_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function PartnerDriversPage() {
  const [rows,       setRows]       = useState<DriverRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [fullName,   setFullName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [ok,         setOk]         = useState<string | null>(null);

  async function loadDrivers() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/drivers", { method: "GET", credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load drivers.");
      setRows(json?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load drivers.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDrivers(); }, []);

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setOk(null);
    try {
      const res  = await fetch("/api/partner/drivers", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, phone }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add driver.");
      setFullName(""); setEmail(""); setPhone("");
      setOk("Driver added successfully.");
      await loadDrivers();
    } catch (e: any) {
      setError(e?.message || "Failed to add driver.");
    } finally { setSaving(false); }
  }

  async function toggleDriver(driverId: string, nextIsActive: boolean) {
    setTogglingId(driverId); setError(null); setOk(null);
    try {
      const res  = await fetch(`/api/partner/drivers/${driverId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextIsActive }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update driver.");
      setOk(nextIsActive ? "Driver activated." : "Driver deactivated.");
      await loadDrivers();
    } catch (e: any) {
      setError(e?.message || "Failed to update driver.");
    } finally { setTogglingId(null); }
  }

  const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30";
  const labelCls = "text-xs font-black uppercase tracking-widest text-black";

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {ok    && <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{ok}</div>}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black">Drivers</h1>
        <p className="mt-1 text-sm font-bold text-black/50">Add and manage drivers for your business.</p>
      </div>

      {/* Driver portal info */}
      <div className="border border-black/10 bg-[#f0f0f0] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-black mb-2">🚗 Driver Portal</h2>
            <p className="text-sm font-bold text-black/60">
              Each driver you add here needs to log in to the Camel Global Driver Portal to accept jobs, record fuel levels, and confirm vehicle collections and returns.
            </p>
            <p className="mt-1 text-sm font-bold text-black/60">
              Share the driver portal link with your drivers so they can log in with the email address you registered them with.
            </p>
          </div>
          <a href="/driver/login" target="_blank" rel="noopener noreferrer"
            className="shrink-0 bg-black px-6 py-3 text-center text-sm font-black text-white hover:opacity-80 transition-opacity">
            Open Driver Portal →
          </a>
        </div>
      </div>

      {/* Add driver form */}
      <div className="border border-black/5 bg-white p-6 md:p-8">
        <h2 className="text-lg font-black text-black mb-6">Add Driver</h2>
        <form onSubmit={addDriver} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Driver full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className={`mt-2 ${inputCls}`} placeholder="e.g. John Smith" />
            </div>
            <div>
              <label className={labelCls}>Driver email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={`mt-2 ${inputCls}`} placeholder="e.g. driver@company.com" />
            </div>
          </div>
          <div className="max-w-xl">
            <label className={labelCls}>Driver phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className={`mt-2 ${inputCls}`} placeholder="e.g. +34 600 000 000" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving ? "Adding…" : "Add Driver"}
          </button>
        </form>
      </div>

      {/* Driver list */}
      <div className="border border-black/5 bg-white p-6 md:p-8">
        <h2 className="text-lg font-black text-black mb-6">Driver List</h2>
        {loading ? (
          <p className="text-sm font-bold text-black/50">Loading drivers…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm font-bold text-black/50">No drivers added yet.</p>
        ) : (
          <div className="overflow-x-auto border border-black/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-black text-white text-left">
                <tr>
                  {["Name","Email","Phone","Status","Created","Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((driver, i) => (
                  <tr key={driver.id} className={`border-t border-black/5 hover:bg-[#f0f0f0] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                    <td className="px-4 py-3 font-black text-black">{driver.full_name}</td>
                    <td className="px-4 py-3 font-bold text-black/70">{driver.email}</td>
                    <td className="px-4 py-3 font-bold text-black/70">{driver.phone || "—"}</td>
                    <td className="px-4 py-3">
                      {driver.is_active ? (
                        <span className="border border-black/20 bg-black text-white px-2 py-0.5 text-xs font-black">Active</span>
                      ) : (
                        <span className="border border-black/10 bg-[#f0f0f0] px-2 py-0.5 text-xs font-black text-black/50">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-black/50">{new Date(driver.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button type="button"
                        onClick={() => toggleDriver(driver.id, !driver.is_active)}
                        disabled={togglingId === driver.id}
                        className="border border-black/20 px-4 py-1.5 text-xs font-black text-black hover:bg-black/5 transition-colors disabled:opacity-60">
                        {togglingId === driver.id ? "Saving…" : driver.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
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