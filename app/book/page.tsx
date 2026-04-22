"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";

type SearchResult = { display_name: string; lat: number; lng: number };

const DEFAULT_CENTER: [number, number] = [38.3452, -0.481];

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

// Lazy-load map to avoid SSR issues
import dynamic from "next/dynamic";
const MapPicker = dynamic(() => import("@/app/partner/profile/MapPicker"), { ssr: false });

export default function BookPage() {
  const router  = useRouter();
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
  const [handLuggage,    setHandLuggage]    = useState("1");
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

  // Pre-fill from homepage widget state
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

    // Auth check — redirect to login preserving destination
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      sessionStorage.setItem("camel_booking_draft", JSON.stringify({
        pickupAddress, pickupLat, pickupLng,
        dropoffAddress, dropoffLat, dropoffLng,
        pickupAt, dropoffAt, passengers, suitcases,
      }));
      router.push("/login?next=/book");
      return;
    }

    if (!pickupLat || !pickupLng) { setError("Please select a pickup address from the suggestions or map."); return; }
    if (!dropoffLat || !dropoffLng) { setError("Please select a drop-off address from the suggestions or map."); return; }
    if (!pickupAt) { setError("Please select a pickup date and time."); return; }
    if (!dropoffAt) { setError("Please select a drop-off date and time."); return; }
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
          passengers: Number(passengers), suitcases: Number(suitcases), hand_luggage: Number(handLuggage),
          vehicle_category_slug: cat.slug, vehicle_category_name: cat.name, notes,
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

  const mapLat = pickupLat ?? dropoffLat ?? DEFAULT_CENTER[0];
  const mapLng = pickupLng ?? dropoffLng ?? DEFAULT_CENTER[1];
  const duration = calculateDurationMinutes(pickupAt, dropoffAt);

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#003768]">Complete your booking</h1>
          <p className="mt-1 text-slate-600">Fill in the details below and we'll send your request to local car hire partners.</p>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-6">

          {/* Addresses */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-lg font-bold text-[#003768] mb-5">Locations</h2>

            {/* Map mode toggle */}
            <div className="flex gap-2 mb-4">
              {(["pickup", "dropoff"] as const).map(m => (
                <button key={m} type="button" onClick={() => setMapMode(m)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${mapMode === m ? "bg-[#003768] text-white" : "border border-black/10 bg-white text-[#003768] hover:bg-[#003768]/5"}`}>
                  Map sets {m}
                </button>
              ))}
              {mapPicking && <span className="self-center text-xs text-slate-500">Looking up address…</span>}
            </div>

            {/* Pickup */}
            <div className="relative mb-4">
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Pickup address <span className="text-red-400">*</span></label>
              <input value={pickupAddress} onChange={e => searchPickup(e.target.value)}
                placeholder="Airport, hotel, address…"
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#003768]" />
              {pickupLoading && <p className="mt-1 text-xs text-slate-400">Searching…</p>}
              {pickupResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border border-black/10 bg-white shadow-lg overflow-hidden">
                  {pickupResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => { setPickupAddress(r.display_name); setPickupLat(r.lat); setPickupLng(r.lng); setPickupResults([]); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#f3f8ff] border-b border-black/5 last:border-b-0">{r.display_name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropoff */}
            <div className="relative mb-5">
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Drop-off address <span className="text-red-400">*</span></label>
              <input value={dropoffAddress} onChange={e => searchDropoff(e.target.value)}
                placeholder="Return location"
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#003768]" />
              {dropoffLoading && <p className="mt-1 text-xs text-slate-400">Searching…</p>}
              {dropoffResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border border-black/10 bg-white shadow-lg overflow-hidden">
                  {dropoffResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => { setDropoffAddress(r.display_name); setDropoffLat(r.lat); setDropoffLng(r.lng); setDropoffResults([]); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#f3f8ff] border-b border-black/5 last:border-b-0">{r.display_name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            <MapPicker lat={mapLat} lng={mapLng} onPick={handleMapPick} />
            <p className="mt-2 text-xs text-slate-400">💡 Click the map to set the {mapMode} location pin.</p>
          </div>

          {/* Dates */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-lg font-bold text-[#003768] mb-5">Dates &amp; Times</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#003768] mb-1.5">Pickup date &amp; time <span className="text-red-400">*</span></label>
                <input type="datetime-local" value={pickupAt} onChange={e => setPickupAt(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#003768]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#003768] mb-1.5">Drop-off date &amp; time <span className="text-red-400">*</span></label>
                <input type="datetime-local" value={dropoffAt} onChange={e => setDropoffAt(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#003768]" />
              </div>
            </div>
            {duration && (
              <div className="mt-3 rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-2 text-sm text-[#003768] font-medium">
                Duration: {durationLabel(duration)}
              </div>
            )}
          </div>

          {/* Passengers & vehicle */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-lg font-bold text-[#003768] mb-5">Passengers &amp; Vehicle</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
              {[
                { label: "Passengers", val: passengers, set: setPassengers, min: 1 },
                { label: "Suitcases", val: suitcases, set: setSuitcases, min: 0 },
                { label: "Hand luggage", val: handLuggage, set: setHandLuggage, min: 0 },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold text-[#003768] mb-1.5">{f.label}</label>
                  <input type="number" min={f.min} value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#003768]" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#003768] mb-1.5">Vehicle category</label>
              <select value={vehicleSlug} onChange={e => setVehicleSlug(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-white outline-none focus:border-[#003768]">
                {FLEET_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-lg font-bold text-[#003768] mb-3">Additional notes</h2>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Flight number, special requirements, anything else the car hire company should know…"
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#003768]" />
          </div>

          <button type="submit" disabled={loading || mapPicking}
            className="w-full rounded-2xl bg-[#ff7a00] py-4 text-base font-black text-white shadow-[0_8px_24px_rgba(255,122,0,0.35)] hover:opacity-95 disabled:opacity-60 transition-opacity">
            {loading ? "Submitting…" : "Submit booking request →"}
          </button>
          <p className="text-center text-xs text-slate-400">Your request goes to local car hire partners — you'll receive bids and can choose the best one.</p>
        </form>
      </div>
    </div>
  );
}