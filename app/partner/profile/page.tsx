"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type PartnerProfileRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  service_radius_km: number | null;
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  created_at?: string | null;
};

type GeoSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

/**
 * Parse coordinate from:
 * - Decimal: "36.1408", "-5.3536"
 * - Decimal + hemi: "36.1408 N", "5.3536 W"
 * - DMS: `36°08'26.81" N`, `36 08 26.81 N`, `5°21'13"W`
 *
 * Returns decimal degrees or null if invalid.
 */
function parseCoord(raw: string, kind: "lat" | "lng"): number | null {
  const input = (raw || "").trim();
  if (!input) return null;

  const s = input.toUpperCase();

  const hasN = s.includes("N");
  const hasS = s.includes("S");
  const hasE = s.includes("E");
  const hasW = s.includes("W");

  const groups = s.match(/-?\d+(?:\.\d+)?/g) || [];

  const looksLikeDms =
    s.includes("°") || s.includes("'") || s.includes('"') || groups.length >= 2;

  let val: number | null = null;

  if (looksLikeDms) {
    if (groups.length < 2) return null;

    const degRaw = Number(groups[0]);
    const minRaw = Number(groups[1]);
    const secRaw = groups.length >= 3 ? Number(groups[2]) : 0;

    if (
      !Number.isFinite(degRaw) ||
      !Number.isFinite(minRaw) ||
      !Number.isFinite(secRaw)
    ) {
      return null;
    }
    if (minRaw < 0 || minRaw >= 60) return null;
    if (secRaw < 0 || secRaw >= 60) return null;

    const degAbs = Math.abs(degRaw);
    const signFromDeg = degRaw < 0 ? -1 : 1;

    val = signFromDeg * (degAbs + minRaw / 60 + secRaw / 3600);
  } else {
    if (groups.length < 1) return null;
    const num = Number(groups[0]);
    if (!Number.isFinite(num)) return null;
    val = num;
  }

  // Hemisphere overrides sign if provided
  if (kind === "lat") {
    if (hasS) val = -Math.abs(val);
    else if (hasN) val = Math.abs(val);
    if (val < -90 || val > 90) return null;
  } else {
    if (hasW) val = -Math.abs(val);
    else if (hasE) val = Math.abs(val);
    if (val < -180 || val > 180) return null;
  }

  return val;
}

function coordDisplay(n: number | null | undefined, kind: "lat" | "lng") {
  if (n === null || n === undefined) return "";
  if (!Number.isFinite(n)) return "";
  const hemi = kind === "lat" ? (n < 0 ? "S" : "N") : n < 0 ? "W" : "E";
  const abs = Math.abs(n);
  const pretty = abs.toFixed(6).replace(/\.?0+$/, "");
  return `${pretty} ${hemi}`;
}

// Robust helper: never throws "Unexpected end of JSON input"
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // If backend returned HTML/plain text, still return something useful
    return { _raw: text };
  }
}

export default function PartnerProfilePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<PartnerProfileRow | null>(null);

  // Store base lat/lng as text so DMS / hemisphere can be entered
  const [baseLatInput, setBaseLatInput] = useState<string>("");
  const [baseLngInput, setBaseLngInput] = useState<string>("");

  // Address search (input)
  const [searchAddress, setSearchAddress] = useState<string>("");
  const [geoLoading, setGeoLoading] = useState(false);

  // ✅ Suggestions
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function syncInputsFromProfile(p: PartnerProfileRow) {
    setBaseLatInput(coordDisplay(p.base_lat, "lat"));
    setBaseLngInput(coordDisplay(p.base_lng, "lng"));
    setSearchAddress(p.base_address ?? "");
  }

  async function loadOrCreateProfile() {
    setLoading(true);
    setError(null);
    setSavedMsg(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      setError("You are not signed in.");
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data: existing, error: existingErr } = await supabase
      .from("partner_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingErr) {
      setError(existingErr.message);
      setLoading(false);
      return;
    }

    if (existing) {
      const row = existing as PartnerProfileRow;
      setProfile(row);
      syncInputsFromProfile(row);
      setLoading(false);
      return;
    }

    // Create from approved application
    setCreating(true);

   const { data: appRow, error: appErr } = (await (supabase as any)
  .from("partner_applications")
  .select("company_name,full_name,email,phone,address,website,status")
  .eq("user_id", userId)
  .maybeSingle()) as {
  data: any;
  error: any;
};


    if (appErr) {
      setError(appErr.message);
      setCreating(false);
      setLoading(false);
      return;
    }

    const status = String(appRow?.status || "").toLowerCase();
    if (status !== "approved") {
      setError("Your account is not approved yet, so profile cannot be created.");
      setCreating(false);
      setLoading(false);
      return;
    }

const payload = {
  user_id: userId,
  company_name: (appRow as any)?.company_name ?? null,
  contact_name: (appRow as any)?.full_name ?? null,
  phone: (appRow as any)?.phone ?? null,
  address: (appRow as any)?.address ?? null,
  website: (appRow as any)?.website ?? null,
  service_radius_km: 30,
  base_address: (appRow as any)?.address ?? null,
  base_lat: null,
  base_lng: null,
};

const { error: insertErr } = await (supabase as any)
  .from("partner_profiles")
  .insert([payload]);

    if (insertErr) {
      setError(insertErr.message);
      setCreating(false);
      setLoading(false);
      return;
    }

    const { data: created, error: createdErr } = await supabase
      .from("partner_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (createdErr) {
      setError(createdErr.message);
    } else {
      const row = created as PartnerProfileRow;
      setProfile(row);
      syncInputsFromProfile(row);
    }

    setCreating(false);
    setLoading(false);
  }

  useEffect(() => {
    loadOrCreateProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ GET suggestions from /api/geocode?q=...
  async function fetchSuggestions(q: string) {
    const query = q.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    // cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
        method: "GET",
        cache: "no-store",
        signal: ac.signal,
      });

      const json = await safeJson(res);

      if (!res.ok) {
        setSuggestions([]);
        return;
      }

      const list = Array.isArray(json?.data) ? (json.data as GeoSuggestion[]) : [];
      setSuggestions(list.slice(0, 5));
    } catch (e: any) {
      // ignore aborts
      if (e?.name === "AbortError") return;
      setSuggestions([]);
    }
  }

  async function handleSearchAddress() {
    const q = searchAddress.trim();
    if (!q) return;

    setGeoLoading(true);
    setError(null);
    setSavedMsg(null);

    // close dropdown when using "Search"
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: q }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          json?._raw ||
          `Geocode failed (${res.status})`;
        throw new Error(msg);
      }

      // Expecting: { formatted_address, lat, lng }
      const formatted_address = json?.formatted_address || q;
      const lat = typeof json?.lat === "number" ? json.lat : null;
      const lng = typeof json?.lng === "number" ? json.lng : null;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Geocode response missing coordinates.");
      }

      // Update UI fields (user must still click Save)
      if (profile) {
        setProfile({
          ...profile,
          base_address: formatted_address,
          base_lat: lat,
          base_lng: lng,
        });
      }

      setSearchAddress(formatted_address);
      setBaseLatInput(coordDisplay(lat, "lat"));
      setBaseLngInput(coordDisplay(lng, "lng"));
      setSavedMsg("Address found ✅ (click Save changes)");
    } catch (e: any) {
      setError(e?.message || "Geocode failed.");
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleUseMyLocation() {
    setError(null);
    setSavedMsg(null);

    if (typeof window === "undefined" || !navigator?.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (profile) {
          setProfile({
            ...profile,
            base_lat: lat,
            base_lng: lng,
          });
        }

        setBaseLatInput(coordDisplay(lat, "lat"));
        setBaseLngInput(coordDisplay(lng, "lng"));
        setSavedMsg("GPS location filled ✅ (click Save changes)");
        setGeoLoading(false);
      },
      (err) => {
        setError(err?.message || "Could not access your location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function save() {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSavedMsg(null);

    const latStr = baseLatInput.trim();
    const lngStr = baseLngInput.trim();

    const parsedLat = latStr === "" ? null : parseCoord(latStr, "lat");
    const parsedLng = lngStr === "" ? null : parseCoord(lngStr, "lng");

    if (latStr !== "" && parsedLat === null) {
      setSaving(false);
      setError(`Invalid latitude. Example: 38° 50' 26.81" N`);
      return;
    }

    if (lngStr !== "" && parsedLng === null) {
      setSaving(false);
      setError(`Invalid longitude. Example: 0° 06' 20.66" E`);
      return;
    }

const updatePayload = {
  company_name: profile.company_name,
  contact_name: profile.contact_name,
  phone: profile.phone,
  address: profile.address,
  website: profile.website,
  base_address: profile.base_address,
  service_radius_km: profile.service_radius_km,
  base_lat: parsedLat,
  base_lng: parsedLng,
};

const { error } = await (supabase as any)
  .from("partner_profiles")
  .update(updatePayload)
  .eq("id", profile.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    const { data: refreshed, error: refreshErr } = await supabase
      .from("partner_profiles")
      .select("*")
      .eq("id", profile.id)
      .single();

    if (refreshErr) {
      setError(refreshErr.message);
      setSaving(false);
      return;
    }

    const row = refreshed as PartnerProfileRow;
    setProfile(row);
    syncInputsFromProfile(row);
    setSavedMsg("Saved ✅");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
        <h1 className="text-2xl font-semibold text-[#003768]">Partner Profile</h1>
        <p className="mt-3 text-gray-600">
          {creating ? "Creating your profile…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
        <h1 className="text-2xl font-semibold text-[#003768]">Partner Profile</h1>
        <p className="mt-3 text-red-600">{error || "No profile found."}</p>
        <button
          onClick={loadOrCreateProfile}
          className="mt-4 rounded-full bg-[#ff7a00] px-5 py-2.5 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
      <div className="mb-6">
        <Link
          href="/partner/dashboard"
          className="text-sm font-medium text-[#005b9f] hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-[#003768]">Partner Profile</h1>
      <p className="mt-2 text-gray-600">
        Update your details. These will be used for matching booking requests.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#003768]">Company name</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.company_name ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, company_name: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">Contact name</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.contact_name ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, contact_name: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">Phone</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.phone ?? ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">Address</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.address ?? ""}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">Website</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.website ?? ""}
            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">
            Service radius (km)
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.service_radius_km ?? 30}
            onChange={(e) =>
              setProfile({
                ...profile,
                service_radius_km: Number(e.target.value),
              })
            }
          />
        </div>

        {/* Base Location block (SEARCH + GPS + SUGGESTIONS) */}
        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#003768]">
                Base location
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Type an address to see suggestions, or use GPS. Then click Save.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-60"
              >
                Use my current location
              </button>

              <button
                type="button"
                onClick={handleSearchAddress}
                disabled={geoLoading}
                className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {geoLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </div>

          <div className="mt-4 relative">
            <label className="text-sm font-medium text-[#003768]">
              Search address
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-black/10 p-2"
              value={searchAddress}
              onChange={(e) => {
                const v = e.target.value;
                setSearchAddress(v);
                setShowSuggestions(true);

                if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
                suggestTimerRef.current = setTimeout(() => fetchSuggestions(v), 250);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // delay so click on a suggestion works
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchAddress();
                }
              }}
              placeholder="Start typing an address…"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s.lat}-${s.lon}-${idx}`}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
                    onMouseDown={(e) => e.preventDefault()} // prevents blur-before-click
                    onClick={() => {
                      const lat = Number(s.lat);
                      const lng = Number(s.lon);

                      if (profile) {
                        setProfile({
                          ...profile,
                          base_address: s.display_name,
                          base_lat: Number.isFinite(lat) ? lat : null,
                          base_lng: Number.isFinite(lng) ? lng : null,
                        });
                      }

                      setSearchAddress(s.display_name);
                      setBaseLatInput(coordDisplay(lat, "lat"));
                      setBaseLngInput(coordDisplay(lng, "lng"));
                      setSuggestions([]);
                      setShowSuggestions(false);
                      setSavedMsg("Address selected ✅ (click Save changes)");
                    }}
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            ) : null}

            <p className="mt-1 text-xs text-gray-500">
              Tip: choose a suggestion for best results, or press Enter to search.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">Base address</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={profile.base_address ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, base_address: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[#003768]">
              Base latitude
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-2"
              value={baseLatInput}
              onChange={(e) => setBaseLatInput(e.target.value)}
              placeholder={`e.g. 38° 50' 26.81" N`}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Base longitude
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-2"
              value={baseLngInput}
              onChange={(e) => setBaseLngInput(e.target.value)}
              placeholder={`e.g. 0° 06' 20.66" E`}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {savedMsg ? <p className="text-sm text-green-700">{savedMsg}</p> : null}

        <button
          onClick={save}
          disabled={saving}
          className="mt-2 rounded-full bg-[#ff7a00] px-6 py-2.5 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}