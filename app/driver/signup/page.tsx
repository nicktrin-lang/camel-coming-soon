"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function DriverSignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Check driver exists
      const res = await fetch("/api/driver/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Driver not found.");
      }

      // 2. Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error("Failed to create account.");
      }

      // 3. Link to driver
      await fetch("/api/driver/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          auth_user_id: userId,
        }),
      });

      setSuccess(true);

      setTimeout(() => {
        router.push("/driver/login");
      }, 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-7xl items-center px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-10">

        <h1 className="text-3xl font-semibold text-[#003768]">
          Set Your Password
        </h1>

        <p className="mt-2 text-slate-600">
          Create your driver login to access assigned jobs.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Account created. Redirecting to login…
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4"
              placeholder="driver@company.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4"
              placeholder="Create password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}