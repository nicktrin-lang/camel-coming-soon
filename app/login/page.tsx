"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import HCaptcha from "@/app/components/HCaptcha";

async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/verify-captcha", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

function LoginForm() {
  const supabase     = useMemo(() => createCustomerBrowserClient(), []);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get("next") || "/bookings";

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [mode,         setMode]         = useState<"login" | "forgot">("login");
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState("");
  const [loginToken,   setLoginToken]   = useState("");
  const [forgotToken,  setForgotToken]  = useState("");
  const [loginKey,     setLoginKey]     = useState(0);
  const [forgotKey,    setForgotKey]    = useState(0);

  const handleLoginToken  = useCallback((t: string) => setLoginToken(t), []);
  const handleForgotToken = useCallback((t: string) => setForgotToken(t), []);
  function resetLoginCaptcha()  { setLoginToken("");  setLoginKey(k => k + 1); }
  function resetForgotCaptcha() { setForgotToken(""); setForgotKey(k => k + 1); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!loginToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const ok = await verifyCaptcha(loginToken);
      if (!ok) { setError("CAPTCHA verification failed."); resetLoginCaptcha(); setLoading(false); return; }
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (err) throw err;
      router.push(nextPath);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to sign in.");
      resetLoginCaptcha();
    } finally { setLoading(false); }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      if (!forgotToken) { setResetError("Please complete the CAPTCHA."); setResetLoading(false); return; }
      const ok = await verifyCaptcha(forgotToken);
      if (!ok) { setResetError("CAPTCHA verification failed."); resetForgotCaptcha(); setResetLoading(false); return; }
      document.cookie = "resetPortal=customer; domain=.camel-global.com; path=/; max-age=3600";
      const res  = await fetch("/api/auth/send-customer-reset-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/?portal=customer` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reset email.");
      setResetSent(true);
    } catch (e: any) {
      setResetError(e?.message || "Failed to send reset email.");
      resetForgotCaptcha();
    } finally { setResetLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          {mode === "login" ? (
            <>
              <h1 className="text-3xl font-black text-[#003768]">Welcome back</h1>
              <p className="mt-1 text-slate-500">Sign in to manage your bookings.</p>
              {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#003768] mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-[#003768]">Password</label>
                    <button type="button" onClick={() => { setMode("forgot"); setError(null); }} className="text-xs text-[#ff7a00] hover:underline">Forgot password?</button>
                  </div>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]" />
                </div>
                <HCaptcha key={loginKey} onVerify={handleLoginToken} onExpire={() => setLoginToken("")} />
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-[#ff7a00] py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-60">
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
              <p className="mt-5 text-center text-sm text-slate-500">
                New to Camel?{" "}
                <Link href="/signup" className="font-semibold text-[#003768] hover:underline">Create an account</Link>
              </p>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                className="mb-5 flex items-center gap-1 text-sm font-medium text-[#003768] hover:underline">← Back to login</button>
              <h1 className="text-3xl font-black text-[#003768]">Reset Password</h1>
              <p className="mt-1 text-slate-500">We'll send you a link to reset your password.</p>
              {resetSent ? (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                  <p className="font-semibold">Reset email sent ✓</p>
                  <p className="mt-1">Check your inbox — it may take a minute.</p>
                  <button type="button" onClick={() => setMode("login")} className="mt-3 text-[#003768] underline font-medium">Back to login</button>
                </div>
              ) : (
                <>
                  {resetError && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{resetError}</div>}
                  <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#003768] mb-1.5">Email address</label>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]" />
                    </div>
                    <HCaptcha key={forgotKey} onVerify={handleForgotToken} onExpire={() => setForgotToken("")} />
                    <button type="submit" disabled={resetLoading}
                      className="w-full rounded-xl bg-[#ff7a00] py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-60">
                      {resetLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}