"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/app/partner/profile/MapPicker"), { ssr: false });

type SearchResult = { display_name: string; lat: number; lng: number };

const DEFAULT_CENTER: [number, number] = [38.3452, -0.481];

const SPORT_OPTIONS = [
  { value: "none",        label: "None" },
  { value: "golf_single", label: "Golf clubs — 1 bag" },
  { value: "golf_two",    label: "Golf clubs — 2 bags" },
  { value: "golf_three",  label: "Golf clubs — 3 bags" },
  { value: "golf_four",   label: "Golf clubs — 4+ bags" },
  { value: "skis_pair",   label: "Skis / snowboard — 1 set" },
  { value: "skis_two",    label: "Skis / snowboard — 2 sets" },
  { value: "skis_three",  label: "Skis / snowboard — 3+ sets" },
  { value: "bikes_one",   label: "Bikes — 1" },
  { value: "bikes_two",   label: "Bikes — 2" },
  { value: "bikes_three", label: "Bikes — 3+" },
  { value: "other",       label: "Other large equipment" },
];

async function reverseLookup(lat: number, lng: number): Promise<string> {
  try {
    const res  = await fetch(`/api/maps/reverse?lat=${lat}&lng=${lng}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    return String(json?.data?.display_name || "").trim() || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

function calculateDurationMinutes(a: string, b: string): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  if (diff <= 0) return null;
  return Math.ceil(diff / (24 * 60 * 60 * 1000)) * 24 * 60;
}

function durationLabel(m: number | null) {
  if (!m) return "—";
  const d = Math.ceil(m / (24 * 60));
  return `${d} day${d === 1 ? "" : "s"}`;
}

const inputCls  = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const selectCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors appearance-none cursor-pointer";
const labelCls  = "block text-xs font-black uppercase tracking-widest text-black mb-2";

export default function BookPage() {
  const router   = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);

  const [pickupAddress,  setPickupAddress]  = useState("");
  const [pickupLat,      setPickupLat]      = useState<number | null>(null);
  const [pickupLng,      setPickupLng]      = useState<number | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat,     setDropoffLat]     = useState<number | null>(null);
  const [dropoffLng,     setDropoffLng]     = useState<number | null>(null);
  const [pickupAt,       setPickupAt]       = useState("");
  const [dropoffAt,      setDropoffAt]      = useState("");
  const [passengers,     setPassengers]     = useState("2");
  const [suitcases,      setSuitcases]      = useState("1");
  const [sportEquipment, setSportEquipment] = useState("none");
  const [vehicleSlug,    setVehicleSlug]    = useState(FLEET_CATEGORIES[0]?.slug || "");
  const [notes,          setNotes]          = useState("");
  const [mapMode,        setMapMode]        = useState<"pickup" | "dropoff">("pickup");

  const [pickupResults,  setPickupResults]  = useState<SearchResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<SearchResult[]>([]);
  const [pickupLoading,  setPickupLoading]  = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [mapPicking,     setMapPicking]     = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const pickupTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill from homepage widget
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem("camel_booking_draft");
      if (!draft) return;
      const d = JSON.parse(draft);
      if (d.pickupAddress)  setPickupAddress(d.pickupAddress);
      if (d.pickupLat)      setPickupLat(d.pickupLat);
      if (d.pickupLng)      setPickupLng(d.pickupLng);
      if (d.dropoffAddress) setDropoffAddress(d.dropoffAddress);
      if (d.dropoffLat)     setDropoffLat(d.dropoffLat);
      if (d.dropoffLng)     setDropoffLng(d.dropoffLng);
      if (d.pickupAt)       setPickupAt(d.pickupAt);
      if (d.dropoffAt)      setDropoffAt(d.dropoffAt);
      if (d.passengers)     setPassengers(String(d.passengers));
      if (d.suitcases)      setSuitcases(String(d.suitcases));
      if (d.vehicleSlug)    setVehicleSlug(d.vehicleSlug);
      if (d.sportEquipment) setSportEquipment(d.sportEquipment);
    } catch {}
  }, []);

  function searchPickup(q: string) {
    setPickupAddress(q); setPickupLat(null); setPickupLng(null);
    if (pickupTimer.current) clearTimeout(pickupTimer.current);
    if (q.length < 3) { setPickupResults([]); return; }
    pickupTimer.current = setTimeout(async () => {
      setPickupLoading(true);
      try {
        const res  = await fetch(`/api/maps/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        setPickupResults(json?.data || []);
      } catch { setPickupResults([]); }
      finally { setPickupLoading(false); }
    }, 300);
  }

  function searchDropoff(q: string) {
    setDropoffAddress(q); setDropoffLat(null); setDropoffLng(null);
    if (dropoffTimer.current) clearTimeout(dropoffTimer.current);
    if (q.length < 3) { setDropoffResults([]); return; }
    dropoffTimer.current = setTimeout(async () => {
      setDropoffLoading(true);
      try {
        const res  = await fetch(`/api/maps/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        setDropoffResults(json?.data || []);
      } catch { setDropoffResults([]); }
      finally { setDropoffLoading(false); }
    }, 300);
  }

  async function handleMapPick(lat: number, lng: number) {
    setMapPicking(true);
    const address = await reverseLookup(lat, lng);
    if (mapMode === "pickup") {
      setPickupLat(lat); setPickupLng(lng); setPickupAddress(address); setPickupResults([]);
    } else {
      setDropoffLat(lat); setDropoffLng(lng); setDropoffAddress(address); setDropoffResults([]);
    }
    setMapPicking(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      sessionStorage.setItem("camel_booking_draft", JSON.stringify({
        pickupAddress, pickupLat, pickupLng,
        dropoffAddress, dropoffLat, dropoffLng,
        pickupAt, dropoffAt, passengers, suitcases, vehicleSlug, sportEquipment,
      }));
      router.push("/login?next=/book");
      return;
    }

    if (!pickupLat || !pickupLng)   { setError("Please select a pickup address from the suggestions or map."); return; }
    if (!dropoffLat || !dropoffLng) { setError("Please select a drop-off address from the suggestions or map."); return; }
    if (!pickupAt)                  { setError("Please select a pickup date and time."); return; }
    if (!dropoffAt)                 { setError("Please select a drop-off date and time."); return; }

    const duration = calculateDurationMinutes(pickupAt, dropoffAt);
    if (!duration) { setError("Drop-off must be at least 1 day after pickup."); return; }

    const cat = FLEET_CATEGORIES.find(c => c.slug === vehicleSlug);
    if (!cat) { setError("Please select a vehicle category."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/test-booking/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          pickup_address: pickupAddress, pickup_lat: pickupLat, pickup_lng: pickupLng,
          dropoff_address: dropoffAddress, dropoff_lat: dropoffLat, dropoff_lng: dropoffLng,
          pickup_at: pickupAt, dropoff_at: dropoffAt,
          journey_duration_minutes: duration,
          passengers: Number(passengers),
          suitcases: Number(suitcases),
          sport_equipment: sportEquipment !== "none" ? sportEquipment : null,
          vehicle_category_slug: cat.slug, vehicle_category_name: cat.name,
          notes,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create booking.");
      sessionStorage.removeItem("camel_booking_draft");
      router.push(`/bookings/${json?.data?.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create booking.");
    } finally {
      setLoading(false);
    }
  }

  const mapLat   = pickupLat ?? dropoffLat ?? DEFAULT_CENTER[0];
  const mapLng   = pickupLng ?? dropoffLng ?? DEFAULT_CENTER[1];
  const duration = calculateDurationMinutes(pickupAt, dropoffAt);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">New Booking</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Confirm your booking</h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            Review your details and we'll send your request to local car hire partners.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full bg-[#f0f0f0] px-6 py-10">
        <div className="mx-auto max-w-3xl">

          {error && (
            <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">

            {/* Locations */}
            <div className="bg-white p-6">
              <p className={labelCls}>Locations</p>

              {/* Map mode toggle */}
              <div className="flex gap-2 mb-4">
                {(["pickup", "dropoff"] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMapMode(m)}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors ${mapMode === m ? "bg-black text-white" : "bg-[#f0f0f0] text-black hover:bg-[#e8e8e8]"}`}>
                    Map sets {m}
                  </button>
                ))}
                {mapPicking && <span className="self-center text-xs font-semibold text-black/40">Looking up address…</span>}
              </div>

              {/* Pickup */}
              <div className="relative mb-3">
                <label className={labelCls}>
                  Pickup address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">📍</span>
                  <input value={pickupAddress} onChange={e => searchPickup(e.target.value)}
                    placeholder="Airport, hotel, address…"
                    className={inputCls + " pl-10"} />
                </div>
                {pickupLoading && <p className="mt-1 text-xs font-semibold text-black/30">Searching…</p>}
                {pickupResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-0.5 bg-white shadow-xl overflow-hidden border border-black/10">
                    {pickupResults.map((r, i) => (
                      <button key={i} type="button"
                        onClick={() => { setPickupAddress(r.display_name); setPickupLat(r.lat); setPickupLng(r.lng); setPickupResults([]); }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-black hover:bg-[#f0f0f0] border-b border-black/5 last:border-b-0">
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropoff */}
              <div className="relative mb-5">
                <label className={labelCls}>
                  Drop-off address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">🏁</span>
                  <input value={dropoffAddress} onChange={e => searchDropoff(e.target.value)}
                    placeholder="Return location"
                    className={inputCls + " pl-10"} />
                </div>
                {dropoffLoading && <p className="mt-1 text-xs font-semibold text-black/30">Searching…</p>}
                {dropoffResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-0.5 bg-white shadow-xl overflow-hidden border border-black/10">
                    {dropoffResults.map((r, i) => (
                      <button key={i} type="button"
                        onClick={() => { setDropoffAddress(r.display_name); setDropoffLat(r.lat); setDropoffLng(r.lng); setDropoffResults([]); }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-black hover:bg-[#f0f0f0] border-b border-black/5 last:border-b-0">
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map */}
              <MapPicker lat={mapLat} lng={mapLng} onPick={handleMapPick} />
              <p className="mt-2 text-xs font-semibold text-black/30">
                💡 Click the map to set the {mapMode} location pin.
              </p>
            </div>

            {/* Dates */}
            <div className="bg-white p-6">
              <p className={labelCls}>Dates &amp; Times</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Pickup date &amp; time <span className="text-red-500">*</span></label>
                  <input type="datetime-local" value={pickupAt} onChange={e => setPickupAt(e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Drop-off date &amp; time <span className="text-red-500">*</span></label>
                  <input type="datetime-local" value={dropoffAt} onChange={e => setDropoffAt(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              {duration && (
                <div className="mt-3 bg-black px-4 py-3">
                  <p className="text-sm font-black text-white">Duration: {durationLabel(duration)}</p>
                </div>
              )}
            </div>

            {/* Passengers & Vehicle */}
            <div className="bg-white p-6">
              <p className={labelCls}>Passengers &amp; Vehicle</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                <div>
                  <label className={labelCls}>Passengers</label>
                  <select value={passengers} onChange={e => setPassengers(e.target.value)} className={selectCls}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} passenger{n>1?"s":""}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Suitcases</label>
                  <select value={suitcases} onChange={e => setSuitcases(e.target.value)} className={selectCls}>
                    {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} suitcase{n!==1?"s":""}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Vehicle type</label>
                  <select value={vehicleSlug} onChange={e => setVehicleSlug(e.target.value)} className={selectCls}>
                    {FLEET_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sport equipment</label>
                  <select value={sportEquipment} onChange={e => setSportEquipment(e.target.value)} className={selectCls}>
                    {SPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white p-6">
              <label className={labelCls}>Additional notes</label>
              <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Flight number, special requirements, anything else the car hire company should know…"
                className={inputCls + " resize-none"} />
            </div>

            <button type="submit" disabled={loading || mapPicking}
              className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
              {loading ? "Submitting…" : "Submit booking request →"}
            </button>

            <p className="text-center text-sm font-semibold text-black/40">
              Your request goes to local car hire partners — you'll receive bids and can choose the best one.
            </p>

          </form>
        </div>
      </div>

    </div>
  );
}