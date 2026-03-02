"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { CamelCard } from "../_components/CamelCard";

function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function PartnerLoginPage() {
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
    if (reason === "rejected")
      return "Your account was rejected. Please contact support.";
    if (reason === "not_signed_in") return "Please log in to continue.";
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

      // ✅ Admin bypass → approvals
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

      const status = (application?.status || "").toLowerCase();

      if (status !== "approved") {
        await supabase.auth.signOut();
        if (status === "rejected") {
          router.replace("/partner/login?reason=rejected");
          return;
        }
        router.replace("/partner/login?reason=pending");
        return;
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
    <CamelCard
      title="Partner Login"
      subtitle="Log in to access your partner dashboard."
    >
      {msg ? (
        <div className="rounded-xl border border-black/5 bg-[#f5f7fa] p-4 text-sm text-gray-700">
          {msg}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#003768]">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#ff7a00]/40"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#ff7a00]/40"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#ff7a00] px-4 py-2.5 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-center text-sm text-gray-700">
          Need an account?{" "}
          <a className="font-semibold text-[#005b9f] hover:underline" href="/partner/signup">
            Partner sign up
          </a>
        </p>
      </form>
    </CamelCard>
  );
}