"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MapPicker = dynamic(() => import("../profile/MapPicker"), {
  ssr: false,
});

type CountryOption = { code: string; name: string };

type Suggestion = {
  display_name: string;
  lat: number | null;
  lng: number | null;
  address_line1?: string;
  address_line2?: string;
  province?: string;
  postcode?: string;
  country?: string;
};

const COUNTRIES: CountryOption[] = [
  { code: "ES", name: "Spain" },
  { code: "GI", name: "Gibraltar" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "US", name: "United States" },
];

function normalizeWebsite(v: string) {
  const s = (v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function parseCoordinate(
  value: string | number | null | undefined,
  kind: "lat" | "lng"
): number | null {
  if (value === null || value === undefined) return null;

  let raw = String(value).trim().toUpperCase();
  if (!raw) return null;

  let sign = 1;

  if (kind === "lat") {
    if (raw.includes("S")) sign = -1;
    raw = raw.replace(/[NS]/g, "");
  }

  if (kind === "lng") {
    if (raw.includes("W")) sign = -1;
    raw = raw.replace(/[EW]/g, "");
  }

  raw = raw.replace(/,/g, ".").trim();

  const num = Number(raw);
  if (!Number.isFinite(num)) return null;

  return sign * num;
}

function countryCodeFromName(name: string) {
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase().trim() === String(name || "").toLowerCase().trim()
  );
  return match?.code || "ES";
}

function buildAddressString(opts: {
  line1: string;
  line2: string;
  province: string;
  postcode: string;
  countryName: string;
}) {
  const parts = [
    opts.line1.trim(),
    opts.line2.trim(),
    [opts.province.trim(), opts.postcode.trim()].filter(Boolean).join(" "),
    opts.countryName.trim(),
  ].filter(Boolean);

  return parts.join(", ");
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

export default function PartnerSignupPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [province, setProvince] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("ES");

  const [searchAddress, setSearchAddress] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [baseLat, setBaseLat] = useState("");
  const [baseLng, setBaseLng] = useState("");

  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function applyAddressParts(item: Suggestion) {
    setSearchAddress(item.display_name || "");
    setBaseAddress(item.display_name || "");
    setBaseLat(item.lat !== null ? String(item.lat) : "");
    setBaseLng(item.lng !== null ? String(item.lng) : "");

    if (item.address_line1) setAddress1(item.address_line1);
    if (item.address_line2) setAddress2(item.address_line2);
    if (item.province) setProvince(item.province);
    if (item.postcode) setPostcode(item.postcode);
    if (item.country) setCountry(countryCodeFromName(item.country));
  }

  function pickSuggestion(item: Suggestion) {
    if (item.lat === null || item.lng === null) return;
    applyAddressParts(item);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function searchForAddress() {
    setError(null);

    const q = searchAddress.trim();
    if (!q) {
      setError("Enter an address to search.");
      return;
    }

    setSearching(true);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Address search failed.");
      }

      const results = Array.isArray(json?.results) ? (json.results as Suggestion[]) : [];

      if (!results.length) {
        setSuggestions([]);
        setShowSuggestions(false);
        throw new Error("No address suggestions found.");
      }

      setSuggestions(results);
      setShowSuggestions(true);

      if (results.length === 1) {
        pickSuggestion(results[0]);
      }
    } catch (e: any) {
      setError(e?.message || "Address search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleMapPick(lat: number, lng: number) {
    setError(null);

    setBaseLat(String(lat));
    setBaseLng(String(lng));

    try {
      const res = await fetch(
        `/api/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(
          String(lng)
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to get address from map location.");
      }

      applyAddressParts({
        display_name: String(json?.display_name || ""),
        lat,
        lng,
        address_line1: String(json?.address_line1 || ""),
        address_line2: String(json?.address_line2 || ""),
        province: String(json?.province || ""),
        postcode: String(json?.postcode || ""),
        country: String(json?.country || ""),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to get address from map location.");
    }
  }

  async function useCurrentLocation() {
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleMapPick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError(err.message || "Could not get your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    const company = companyName.trim();
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    const ph = phone.trim();

    if (!company) return setError("Company name is required.");
    if (!name) return setError("Full name is required.");
    if (!mail) return setError("Email is required.");
    if (!ph) return setError("Phone is required.");
    if (!password || password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    if (!address1.trim()) return setError("Address line 1 is required.");
    if (!province.trim()) return setError("Province / State is required.");
    if (!postcode.trim()) return setError("Postcode is required.");
    if (!country) return setError("Country is required.");

    const countryName = COUNTRIES.find((c) => c.code === country)?.name || country;

    const combinedAddress = buildAddressString({
      line1: address1,
      line2: address2,
      province,
      postcode,
      countryName,
    });

    const lat = parseCoordinate(baseLat, "lat");
    const lng = parseCoordinate(baseLng, "lng");

    setLoading(true);

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          data: {
            full_name: name,
            company_name: company,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const userId = signUpData.user?.id;
      if (!userId) {
        throw new Error("Could not create user account.");
      }

      const payload = {
        user_id: userId,
        company_name: company,
        full_name: name,
        email: mail,
        phone: ph,
        address: combinedAddress,
        address1: address1.trim(),
        address2: address2.trim(),
        province: province.trim(),
        postcode: postcode.trim(),
        country: countryName,
        website: normalizeWebsite(website),
        status: "pending",
        base_address: baseAddress.trim() || searchAddress.trim() || combinedAddress,
        base_lat: lat,
        base_lng: lng,
      };

      const { error: insertErr } = await (supabase as any)
        .from("partner_applications")
        .insert(payload);

      if (insertErr) throw insertErr;

      setOk("Account created. Your application is now pending approval.");
      router.replace("/partner/login?reason=created");
    } catch (e: any) {
      setError(e?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  const lat = parseCoordinate(baseLat, "lat");
  const lng = parseCoordinate(baseLng, "lng");

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <Link href="/partner/signup" className="flex items-center">
            <Image
              src="/camel-logo.png"
              alt="Camel Global logo"
              width={180}
              height={60}
              priority
              className="h-[52px] w-auto"
            />
          </Link>

          <Link
            href="/partner/login"
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Login
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-28">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#003768] md:text-4xl">
                Partner Sign Up
              </h1>
              <p className="mt-3 text-base text-slate-600 md:text-lg">
                Create your partner account. We review and approve partners before going live.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-medium text-[#003768]">
                Company name <span className="text-red-500">*</span>
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-4 md:p-6">
              <h2 className="text-xl font-semibold text-[#003768] md:text-2xl">Address</h2>
              <p className="mt-2 text-slate-600">
                This is used for your application and initial profile setup.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
                >
                  Use my current location
                </button>

                <button
                  type="button"
                  onClick={searchForAddress}
                  className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-[#003768]">Search address</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={searchAddress}
                  onChange={(e) => {
                    setSearchAddress(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchForAddress();
                    }
                  }}
                  placeholder="Search for your business or fleet location"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Tip: click Search or press Enter, then choose a suggestion.
                </p>

                {showSuggestions && suggestions.length > 0 ? (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
                    {suggestions.map((item, idx) => (
                      <button
                        key={`${item.display_name}-${idx}`}
                        type="button"
                        onClick={() => pickSuggestion(item)}
                        className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm text-gray-800 hover:bg-[#f3f8ff] last:border-b-0"
                      >
                        {item.display_name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-[#003768]">Car Fleet Address</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="Selected map/search address"
                />
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Address line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="Street address, building, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Business Address line 2
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="Apartment, suite, unit, etc. (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Province / State <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="e.g. Alicante"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Postcode <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g. 03501"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Base latitude
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={baseLat}
                      onChange={(e) => setBaseLat(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Base longitude
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={baseLng}
                      onChange={(e) => setBaseLng(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />
                  <p className="mt-2 text-xs text-slate-500">
                    Click anywhere on the map to set the partner base location.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Website</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-2 text-xs text-slate-500">Minimum 8 characters.</p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {ok ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {ok}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create partner account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}