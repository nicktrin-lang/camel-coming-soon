"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function PartnerSettingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/delete-account", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete account.");
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      window.location.replace("/partner/login?reason=account_deleted");
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div className="border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-black text-black">Settings</h1>
        <p className="mt-1 text-sm font-bold text-black/50">Manage your account preferences.</p>
      </div>

      {/* Delete Account */}
      <div className="border border-red-200 bg-white p-6">
        <h2 className="text-lg font-black text-red-700">Delete Account</h2>
        <p className="mt-2 text-sm font-bold text-black/60">
          Deleting your account will take your profile offline and remove your access to the Camel Global partner portal immediately.
          Your booking history will be retained for financial and audit purposes. This action cannot be undone.
        </p>
        <p className="mt-3 text-sm font-bold text-black/60">
          If you have active bookings, please ensure they are completed or cancelled before deleting your account.
          For any questions <a href="/partner/contact" className="font-black text-black underline hover:text-[#ff7a00] transition-colors">contact our support team</a>.
        </p>

        {!showConfirm ? (
          <button type="button" onClick={() => setShowConfirm(true)}
            className="mt-5 border border-red-300 px-5 py-2.5 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">
            Request Account Deletion
          </button>
        ) : (
          <div className="mt-5 space-y-4 border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-black text-red-800">
              Are you sure? This will permanently deactivate your partner account.
            </p>
            <p className="text-sm font-bold text-red-700">
              Type <span className="font-mono font-black">DELETE</span> below to confirm.
            </p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-black outline-none focus:border-red-500 placeholder:text-black/30" />
            {error && <p className="text-sm font-bold text-red-700">{error}</p>}
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(""); setError(null); }}
                disabled={loading}
                className="border border-black/20 px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                disabled={confirmText !== "DELETE" || loading}
                className="bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? "Deleting…" : "Confirm Delete Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}