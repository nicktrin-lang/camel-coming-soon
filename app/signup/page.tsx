"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import HCaptcha from "@/app/components/HCaptcha";

export default function SignupPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router   = useRouter();

  const [fullName,     setFullName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey,   setCaptchaKey]   = useState(0);

  const handleCaptcha = useCallback((t: string) => setCaptchaToken(t), []);
  function resetCaptcha() { setCaptchaToken(""); setCaptchaKey(k => k + 1); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!captchaToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!captchaRes.ok) { setError("CAPTCHA verification failed."); resetCaptcha(); setLoading(false); return; }

      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail, password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), account_type: "customer" } },
      });
      if (signUpErr) throw signUpErr;

      const userId = data.user?.id;
      if (!userId) throw new Error("Could not create account.");

      const profileRes = await fetch("/api/test-booking/customer-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, full_name: fullName.trim() || null, phone: phone.trim() || null }),
      });
      if (!profileRes.ok) {
        const j = await profileRes.json().catch(() => null);
        throw new Error(j?.error || "Failed to create profile.");
      }

      router.push("/bookings");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create account.");
      resetCaptcha();
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h1 className="text-3xl font-black text-[#003768]">Create your account</h1>
          <p className="mt-1 text-slate-500">Start booking meet &amp; greet car hire in minutes.</p>

          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]"
                placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]"
                placeholder="+44 7700 000000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]"
                placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#003768]"
                placeholder="Min. 8 characters" />
            </div>
            <HCaptcha key={captchaKey} onVerify={handleCaptcha} onExpire={() => setCaptchaToken("")} />
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-[#ff7a00] py-3 font-bold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-60">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#003768] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}