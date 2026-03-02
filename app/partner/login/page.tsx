"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function PartnerLoginInner() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const params = useSearchParams();

  const reason = params.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reasonMessage() {
    if (reason === "pending") return "Your account is pending approval.";
    if (reason === "rejected") return "Your account was rejected. Please contact support.";
    if (reason === "not_signed_in") return "Please log in to continue.";
    if (reason === "signed_out") return "You have been signed out.";
    if (reason === "not_authorized") return "You are not authorized to access that page.";
    if (reason === "not_found") return "No partner application found for this user.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const emailNorm = email.trim().toLowerCase();
      const admins = getAdminEmails();

      // 1) Auth login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("Login failed.");

      // ✅ Admin bypass: go straight to approvals
      if (admins.includes(emailNorm)) {
        router.push("/admin/approvals");
        return;
      }

      // 2) Partner approval check (non-admin only)
      const { data: application, error: appError } = await supabase
        .from("partner_applications")
        .select("status")
        .eq("user_id", userId)
        .single();

      if (appError) throw appError;

      const status = String((application as any)?.status || "").toLowerCase();

      if (status !== "approved") {
        await supabase.auth.signOut();
        throw new Error("Your account is pending approval.");
      }

      // Approved partner → dashboard
      router.push("/partner/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const msg = reasonMessage();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-2xl font-semibold">Partner Login</h1>

        {msg ? (
          <p className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
            {msg}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Need an account?{" "}
            <a className="underline" href="/partner/signup">
              Partner signup
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function PartnerLoginPage() {
  // ✅ Required for Next.js build: useSearchParams must be inside Suspense
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white">
          <div className="mx-auto max-w-md px-6 py-12">
            <h1 className="text-2xl font-semibold">Partner Login</h1>
            <p className="mt-3 text-sm text-gray-600">Loading…</p>
          </div>
        </main>
      }
    >
      <PartnerLoginInner />
    </Suspense>
  );
}