"use client";

import { useMemo, useState } from "react";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

export default function CustomerSettingsPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);

  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/test-booking/delete-account", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete account.");
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      window.location.replace("/test-booking/login?reason=account_deleted");
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-[#003768]">Account Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your Camel Global customer account.</p>
      </div>

      {/* Delete Account */}
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-red-700">Delete Account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Deleting your account will remove your access to the Camel Global platform immediately.
          In line with GDPR, your personal data will be flagged for deletion. Booking records may be
          retained for legal and financial audit purposes. This action cannot be undone.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          For any questions or to request a full data export before deletion, contact{" "}
          <span className="font-medium text-[#003768]">support@camel-global.com</span>.
        </p>

        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="mt-5 rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            Request Account Deletion
          </button>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-800">
              Are you sure? This will permanently deactivate your account.
            </p>
            <p className="text-sm text-red-700">
              Type <span className="font-mono font-bold">DELETE</span> below to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
            {error && (
              <p className="text-sm text-red-700">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(""); setError(null); }}
                disabled={loading}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || loading}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Deleting…" : "Confirm Delete Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}