"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AppStatus = "pending" | "approved" | "rejected";

type PartnerApplication = {
  id: string;
  email: string | null;
  company_name: string | null;
  full_name: string | null;
  address: string | null;
  created_at: string | null;
  status: AppStatus;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

export default function PartnerDashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();

        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        const user = userData.user;
        const userEmail = String(user.email || "").trim().toLowerCase();

        if (!mounted) return;
        setEmail(userEmail);

        const { data: app } = await supabase
          .from("partner_applications")
          .select("id,email,company_name,full_name,address,created_at,status")
          .eq("email", userEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;
        setApplication((app as PartnerApplication | null) ?? null);
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

  const status = application?.status || "pending";

  const statusClass =
    status === "approved"
      ? "text-green-700"
      : status === "rejected"
      ? "text-red-700"
      : "text-yellow-700";

  const statusLabel =
    status === "approved"
      ? "Approved ✅"
      : status === "rejected"
      ? "Rejected"
      : "Pending";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Dashboard</h2>
        <p className="mt-2 text-slate-600">
          {status === "approved"
            ? "Welcome back. Your account is approved."
            : status === "rejected"
            ? "Your application has been rejected."
            : "Your application is under review."}
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h3 className="text-xl font-semibold text-[#003768]">Account</h3>

        {loading ? (
          <p className="mt-6 text-slate-600">Loading…</p>
        ) : (
          <div className="mt-6 space-y-3 text-base text-slate-800">
            <div>
              <span className="font-medium">Status:</span>{" "}
              <span className={`font-semibold ${statusClass}`}>{statusLabel}</span>
            </div>

            <div>
              <span className="font-medium">Signed in as:</span> {email || "—"}
            </div>

            <div>
              <span className="font-medium">Name:</span> {application?.full_name || "—"}
            </div>

            <div>
              <span className="font-medium">Company:</span> {application?.company_name || "—"}
            </div>

            <div>
              <span className="font-medium">Address:</span> {application?.address || "—"}
            </div>

            <div>
              <span className="font-medium">Created:</span>{" "}
              {fmtDateTime(application?.created_at)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}