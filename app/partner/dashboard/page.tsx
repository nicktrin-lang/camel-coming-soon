"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type DashboardState = {
  email: string;
  status: string;
  contact_name: string;
  company_name: string;
  address: string;
  created_at: string;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

function formatStatus(status: string) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return "Pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function PartnerDashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardState>({
    email: "",
    status: "pending",
    contact_name: "",
    company_name: "",
    address: "",
    created_at: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();

        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        const user = userData.user;
        const email = String(user.email || "").trim().toLowerCase();

        const { data: profile, error: profileErr } = await supabase
          .from("partner_profiles")
          .select("contact_name, company_name, address, created_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileErr) {
          throw profileErr;
        }

        let application: any = null;

        if (!profile) {
          const { data: appRow, error: appErr } = await supabase
            .from("partner_applications")
            .select("full_name, company_name, address, status, created_at")
            .eq("email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (appErr) {
            throw appErr;
          }

          application = appRow;
        } else {
          const { data: appRow } = await supabase
            .from("partner_applications")
            .select("status, created_at")
            .eq("email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          application = appRow;
        }

        if (!mounted) return;

        setData({
          email,
          status: String(application?.status || "pending"),
          contact_name: String(
            profile?.contact_name ??
              application?.full_name ??
              user.user_metadata?.full_name ??
              ""
          ),
          company_name: String(
            profile?.company_name ??
              application?.company_name ??
              user.user_metadata?.company_name ??
              ""
          ),
          address: String(profile?.address ?? application?.address ?? ""),
          created_at: String(profile?.created_at ?? application?.created_at ?? ""),
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load dashboard.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const statusLabel = formatStatus(data.status);
  const isApproved = data.status.toLowerCase() === "approved";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[#003768]">Partner Dashboard</h1>
        <p className="mt-2 text-slate-600">
          {isApproved
            ? "Welcome back. Your account is approved."
            : "Your account is being reviewed."}
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Account</h2>

        <div className="mt-6 space-y-4 text-lg text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Status:</span>{" "}
            <span
              className={
                isApproved ? "font-semibold text-green-700" : "font-semibold text-amber-700"
              }
            >
              {statusLabel}
              {isApproved ? " ✅" : ""}
            </span>
          </p>

          <p>
            <span className="font-medium text-slate-900">Signed in as:</span>{" "}
            {data.email || "—"}
          </p>

          <p>
            <span className="font-medium text-slate-900">Name:</span>{" "}
            {data.contact_name || "—"}
          </p>

          <p>
            <span className="font-medium text-slate-900">Company:</span>{" "}
            {data.company_name || "—"}
          </p>

          <p>
            <span className="font-medium text-slate-900">Address:</span>{" "}
            {data.address || "—"}
          </p>

          <p>
            <span className="font-medium text-slate-900">Created:</span>{" "}
            {fmtDateTime(data.created_at)}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/partner/profile"
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Edit Profile
          </Link>

          <Link
            href="/partner/requests"
            className="rounded-full border border-black/10 bg-white px-6 py-3 font-semibold text-[#003768] hover:bg-black/5"
          >
            View Requests
          </Link>
        </div>
      </div>
    </div>
  );
}