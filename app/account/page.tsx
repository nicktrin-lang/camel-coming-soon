"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

export default function AccountPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router   = useRouter();

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [fullName,     setFullName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [confirmText,  setConfirmText]  = useState("");
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login?next=/account"); return; }
      const u = session.user;
      setEmail(u.email || "");
      setFullName(String(u.user_metadata?.full_name || "").trim());
      setPhone(String(u.user_metadata?.phone || "").trim());

      // Also try to load from customer_profiles
      try {
        const res  = await fetch("/api/test-booking/customer-profile", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.full_name) setFullName(json.full_name);
          if (json?.phone)     setPhone(json.phone);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      // Update auth metadata
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), phone: phone.trim() },
      });
      if (metaErr) throw metaErr;

      // Update profile table
      const res  = await fetch("/api/test-booking/customer-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session.user.id, full_name: fullName.trim() || null, phone: phone.trim() || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save profile.");
      }
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true); setDeleteError(null);
    try {
      const res  = await fetch("/api/test-booking/delete-account", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete account.");
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      window.location.replace("/login?reason=account_deleted");
    } catch (e: any) {
      setDeleteError(e?.message || "Something went wrong.");
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
      <p className="text-slate-500">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="mx-auto max-w-2xl px-4 space-y-6">

        <div>
          <h1 className="text-3xl font-black text-[#003768]">Your Account</h1>
          <p className="mt-1 text-slate-600">Manage your profile and account settings.</p>
        </div>

        {/* Profile */}
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-bold text-[#003768] mb-6">Profile Details</h2>

          {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {saved && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">✓ Profile saved successfully.</div>}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]"
                placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]"
                placeholder="+44 7700 000000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Email address</label>
              <input value={email} disabled
                className="w-full rounded-xl border border-black/10 bg-slate-50 px-4 py-3 text-slate-500 cursor-not-allowed" />
              <p className="mt-1 text-xs text-slate-400">Email address cannot be changed here. Contact support if needed.</p>
            </div>
            <button type="submit" disabled={saving}
              className="rounded-full bg-[#ff7a00] px-8 py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-60 transition-opacity">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        {/* Delete account */}
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-bold text-red-700 mb-3">Delete Account</h2>
          <p className="text-sm text-slate-600 mb-2">
            Deleting your account will remove your access immediately. Booking records are retained for legal and financial purposes in line with GDPR. This cannot be undone.
          </p>
          <p className="text-sm text-slate-600">
            For questions or to request a data export, contact <span className="font-medium text-[#003768]">support@camel-global.com</span>.
          </p>

          {!showConfirm ? (
            <button type="button" onClick={() => setShowConfirm(true)}
              className="mt-5 rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors">
              Request Account Deletion
            </button>
          ) : (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 space-y-4">
              <p className="text-sm font-semibold text-red-800">Are you sure? This will permanently deactivate your account.</p>
              <p className="text-sm text-red-700">Type <span className="font-mono font-bold">DELETE</span> to confirm.</p>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500" />
              {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowConfirm(false); setConfirmText(""); setDeleteError(null); }} disabled={deleting}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleDelete} disabled={confirmText !== "DELETE" || deleting}
                  className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  {deleting ? "Deleting…" : "Confirm Delete Account"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}