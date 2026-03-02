"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type PartnerProfileRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  address: string | null;
  created_at: string | null;
  // optional fields exist but not required here
};

type PartnerApplicationRow = {
  id: string | number;
  user_id: string;
  company_name: string | null;
  full_name: string | null;
  address: string | null;
  created_at: string | null;
  status: string | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function PartnerDashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string>("—");
  const [status, setStatus] = useState<string>("—");

  const [name, setName] = useState<string>("—");
  const [company, setCompany] = useState<string>("—");
  const [createdAt, setCreatedAt] = useState<string>("—");
  const [address, setAddress] = useState<string>("—");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user?.id) {
        router.replace("/partner/login?reason=not_signed_in");
        return;
      }

      const userId = userData.user.id;
      const userEmail = userData.user.email || "—";
      setEmail(userEmail);

      // 1) Prefer partner_profiles (this is what the profile page writes to)
      const { data: prof, error: profErr } = await supabase
        .from("partner_profiles")
        .select("id,user_id,company_name,contact_name,address,created_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (profErr) throw profErr;

      if (prof) {
        const p = prof as PartnerProfileRow;

        setName(p.contact_name || "—");
        setCompany(p.company_name || "—");
        setAddress(p.address || "—");
        setCreatedAt(fmtDateTime(p.created_at));

        // If they have a profile, they are approved (based on your flow)
        setStatus("Approved ✅");
        setLoading(false);
        return;
      }

      // 2) Fallback to partner_applications (for new accounts that don’t have a profile yet)
      const { data: app, error: appErr } = await supabase
        .from("partner_applications")
        .select("id,user_id,company_name,full_name,address,created_at,status")
        .eq("user_id", userId)
        .maybeSingle();

      if (appErr) throw appErr;

      const a = app as PartnerApplicationRow | null;

      setName(a?.full_name || "—");
      setCompany(a?.company_name || "—");
      setAddress(a?.address || "—");
      setCreatedAt(fmtDateTime(a?.created_at));

      const st = String(a?.status || "pending").toLowerCase();
      setStatus(st === "approved" ? "Approved ✅" : st === "rejected" ? "Rejected" : "Pending");

      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard.");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
      <h1 className="text-2xl font-semibold text-[#003768]">Partner Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome back. Your account is approved.</p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-semibold text-[#003768]">Account</h2>

        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <div>
            <span className="text-gray-600">Status:</span>{" "}
            <span className="font-semibold text-green-700">
              {loading ? "Loading…" : status}
            </span>
          </div>

          <div>
            <span className="text-gray-600">Signed in as:</span>{" "}
            <span className="text-gray-900">{email}</span>
          </div>

          <div>
            <span className="text-gray-600">Name:</span>{" "}
            <span className="text-gray-900">{loading ? "Loading…" : name}</span>
          </div>

          <div>
            <span className="text-gray-600">Company:</span>{" "}
            <span className="text-gray-900">{loading ? "Loading…" : company}</span>
          </div>

          <div>
            <span className="text-gray-600">Address:</span>{" "}
            <span className="text-gray-900">{loading ? "Loading…" : address}</span>
          </div>

          <div>
            <span className="text-gray-600">Created:</span>{" "}
            <span className="text-gray-900">{loading ? "Loading…" : createdAt}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/partner/profile"
            className="rounded-full bg-[#ff7a00] px-6 py-2.5 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Edit Profile
          </Link>

          <Link
            href="/partner/requests"
            className="rounded-full border border-black/10 bg-white px-6 py-2.5 font-semibold text-[#003768] hover:bg-black/5"
          >
            View Requests
          </Link>
        </div>
      </div>
    </div>
  );
}