"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AppStatus = "pending" | "approved" | "rejected";

type AccountApplication = {
  id: string;
  user_id: string | null;
  email: string | null;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  address1?: string | null;
  address2?: string | null;
  province?: string | null;
  postcode?: string | null;
  country?: string | null;
  website?: string | null;
  status: string | null;
  created_at: string | null;
};

type AccountProfile = {
  id: string;
  user_id: string | null;
  role?: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  address1?: string | null;
  address2?: string | null;
  province?: string | null;
  postcode?: string | null;
  country?: string | null;
  website: string | null;
  service_radius_km: number | null;
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

function fmtValue(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function fmtLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
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

export default function AdminAccountDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AppStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [application, setApplication] = useState<AccountApplication | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [fleetCount, setFleetCount] = useState(0);
  const [isLiveProfile, setIsLiveProfile] = useState(false);
  const [liveProfileReason, setLiveProfileReason] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const adminRes = await fetch("/api/admin/is-admin", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const adminJson = await safeJson(adminRes);

      if (!adminJson?.isAdmin) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const id = String(params?.id || "").trim();
      if (!id) {
        throw new Error("Missing partner account id.");
      }

      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load partner account.");
      }

      setApplication((json?.application || null) as AccountApplication | null);
      setProfile((json?.profile || null) as AccountProfile | null);
      setFleetCount(Number(json?.fleet_count || 0));
      setIsLiveProfile(!!json?.is_live_profile);
      setLiveProfileReason(String(json?.live_profile_reason || ""));
    } catch (e: any) {
      setError(e?.message || "Failed to load partner account.");
      setApplication(null);
      setProfile(null);
      setFleetCount(0);
      setIsLiveProfile(false);
      setLiveProfileReason("");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: AppStatus) {
    if (!application?.id) return;

    setSavingStatus(status);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/admin/applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: application.id,
          status,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to update application status.");
      }

      setApplication((prev) => (prev ? { ...prev, status } : prev));

      if (json?.warning) {
        setNotice(String(json.warning));
      } else {
        setNotice(`Application status updated to ${status}.`);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to update application status.");
    } finally {
      setSavingStatus(null);
    }
  }

  useEffect(() => {
    load();
  }, [params?.id]);

  const displayCompany = profile?.company_name || application?.company_name || "—";
  const displayContact = profile?.contact_name || application?.full_name || "—";
  const displayPhone = profile?.phone || application?.phone || "—";
  const displayWebsite = profile?.website || application?.website || "—";

  const businessAddress =
    profile?.address ||
    application?.address ||
    [
      profile?.address1 || application?.address1,
      profile?.address2 || application?.address2,
      profile?.province || application?.province,
      profile?.postcode || application?.postcode,
      profile?.country || application?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    "—";

  const addressLine1 = profile?.address1 || application?.address1 || "—";
  const addressLine2 = profile?.address2 || application?.address2 || "—";
  const province = profile?.province || application?.province || "—";
  const postcode = profile?.postcode || application?.postcode || "—";
  const country = profile?.country || application?.country || "—";

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        Loading...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          Partner account not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Company</p>
          <p className="mt-1 text-xl font-semibold text-[#003768]">{fmtValue(displayCompany)}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Application Status</p>
          <div className="mt-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                application.status
              )}`}
            >
              {fmtLabel(application.status)}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Live Profile</p>
          <div className="mt-2">
            {isLiveProfile ? (
              <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                Yes
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                No
              </span>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Fleet Categories</p>
          <p className="mt-1 text-xl font-semibold text-[#003768]">{fleetCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Company Details</h2>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-500">Contact Name</span>
                <p className="font-medium text-slate-800">{fmtValue(displayContact)}</p>
              </div>

              <div>
                <span className="text-slate-500">Email</span>
                <p className="font-medium text-slate-800">{fmtValue(application.email)}</p>
              </div>

              <div>
                <span className="text-slate-500">Phone</span>
                <p className="font-medium text-slate-800">{fmtValue(displayPhone)}</p>
              </div>

              <div>
                <span className="text-slate-500">Website</span>
                <p className="font-medium text-slate-800">{fmtValue(displayWebsite)}</p>
              </div>

              <div>
                <span className="text-slate-500">Role</span>
                <p className="font-medium capitalize text-slate-800">
                  {fmtLabel(profile?.role || "partner")}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Service Radius</span>
                <p className="font-medium text-slate-800">
                  {profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Business Address</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Full Address</span>
                <p className="font-medium text-slate-800">{businessAddress}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <span className="text-slate-500">Address Line 1</span>
                  <p className="font-medium text-slate-800">{addressLine1}</p>
                </div>

                <div>
                  <span className="text-slate-500">Address Line 2</span>
                  <p className="font-medium text-slate-800">{addressLine2}</p>
                </div>

                <div>
                  <span className="text-slate-500">Province</span>
                  <p className="font-medium text-slate-800">{province}</p>
                </div>

                <div>
                  <span className="text-slate-500">Postcode</span>
                  <p className="font-medium text-slate-800">{postcode}</p>
                </div>

                <div className="md:col-span-2">
                  <span className="text-slate-500">Country</span>
                  <p className="font-medium text-slate-800">{country}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Fleet Base Location</h2>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-500">Base Address</span>
                <p className="font-medium text-slate-800">{fmtValue(profile?.base_address)}</p>
              </div>

              <div>
                <span className="text-slate-500">Coordinates</span>
                <p className="font-medium text-slate-800">
                  {profile?.base_lat !== null &&
                  profile?.base_lat !== undefined &&
                  profile?.base_lng !== null &&
                  profile?.base_lng !== undefined
                    ? `${profile.base_lat}, ${profile.base_lng}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Admin Controls</h2>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={savingStatus !== null}
                onClick={() => setStatus("approved")}
                className="w-full rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {savingStatus === "approved" ? "Saving..." : "Approve"}
              </button>

              <button
                type="button"
                disabled={savingStatus !== null}
                onClick={() => setStatus("rejected")}
                className="w-full rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {savingStatus === "rejected" ? "Saving..." : "Reject"}
              </button>

              <button
                type="button"
                disabled={savingStatus !== null}
                onClick={() => setStatus("pending")}
                className="w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
              >
                {savingStatus === "pending" ? "Saving..." : "Set Pending"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Live Profile Check</h2>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Fleet address present</span>
                <p className="font-medium text-slate-800">
                  {String(profile?.base_address || "").trim() ? "Yes" : "No"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Fleet categories added</span>
                <p className="font-medium text-slate-800">{fleetCount > 0 ? "Yes" : "No"}</p>
              </div>

              <div>
                <span className="text-slate-500">Live profile status</span>
                <div className="mt-1">
                  {isLiveProfile ? (
                    <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      No
                    </span>
                  )}
                </div>
              </div>

              {!isLiveProfile ? (
                <div>
                  <span className="text-slate-500">Reason</span>
                  <p className="font-medium text-slate-800">{fmtValue(liveProfileReason)}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Application</h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                      application.status
                    )}`}
                  >
                    {fmtLabel(application.status)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500">Created</span>
                <p className="font-medium text-slate-800">{fmtDateTime(application.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}