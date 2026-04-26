"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { translations } from "./marketing/translations";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import { CITIES, DEFAULT_CITY, citiesByCountry, type CityEntry } from "@/lib/cities";
import CurrencySelector from "@/app/components/CurrencySelector";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

type Lang = keyof typeof translations;
type AddressResult = {
  display_name: string;
  label: string;
  subtitle: string;
  type: string;
  lat: number;
  lng: number;
};

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

const TYPE_ICON: Record<string, string> = {
  airport: "✈",
  hotel:   "🏨",
  food:    "🍽",
  train:   "🚆",
  bus:     "🚌",
  street:  "🏠",
  place:   "📍",
};

function calculateDurationMinutes(a: string, b: string): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  if (diff <= 0) return null;
  return Math.ceil(diff / (24 * 60 * 60 * 1000)) * 24 * 60;
}

function ResultRow({ r, onClick }: { r: AddressResult; onClick: () => void }) {
  const icon = TYPE_ICON[r.type] || "📍";
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-[#f0f0f0] border-b border-black/5 last:border-b-0 flex items-start gap-3">
      <span className="mt-0.5 text-base shrink-0 w-5 text-center">{icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm font-black text-black truncate">{r.label || r.display_name}</span>
        {r.subtitle && <span className="text-xs font-semibold text-black/50 truncate">{r.subtitle}</span>}
      </span>
    </button>
  );
}

function CustomerHome() {
  const router   = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);

  const [city,           setCity]          = useState<CityEntry>(DEFAULT_CITY);
  const [pickupAddress,  setPickupAddress]  = useState("");
  const [pickupLat,      setPickupLat]      = useState<number | null>(null);
  const [pickupLng,      setPickupLng]      = useState<number | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat,     setDropoffLat]     = useState<number | null>(null);
  const [dropoffLng,     setDropoffLng]     = useState<number | null>(null);
  const [pickupAt,       setPickupAt]       = useState("");
  const [dropoffAt,      setDropoffAt]      = useState("");
  const [passengers,     setPassengers]     = useState(2);
  const [suitcases,      setSuitcases]      = useState(1);
  const [vehicleSlug,    setVehicleSlug]    = useState(FLEET_CATEGORIES[0]?.slug || "");
  const [sportEquipment, setSportEquipment] = useState("none");
  const [notes,          setNotes]          = useState("");
  const [notesOpen,      setNotesOpen]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [submitting,     setSubmitting]     = useState(false);

  const [pickupResults,  setPickupResults]  = useState<AddressResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<AddressResult[]>([]);
  const [pickupLoading,  setPickupLoading]  = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);

  const pickupTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const hash   = window.location.hash;
      const p      = new URLSearchParams(window.location.search);
      const portal = p.get("portal");
      if (portal === "customer")    window.location.replace("/reset-password" + hash);
      else if (portal === "driver") window.location.replace("/driver/reset-password" + hash);
      else                          window.location.replace("/partner/reset-password" + hash);
    }
  }, []);

  function buildSearchUrl(q: string) {
    return `/api/maps/search?q=${encodeURIComponent(q)}&lat=${city.lat}&lon=${city.lng}`;
  }

  async function searchPickup(q: string) {
    setPickupAddress(q); setPickupLat(null); setPickupLng(null);
    if (pickupTimer.current) clearTimeout(pickupTimer.current);
    if (q.length < 2) { setPickupResults([]); return; }
    pickupTimer.current = setTimeout(async () => {
      setPickupLoading(true);
      try {
        const r = await fetch(buildSearchUrl(q), { cache: "no-store" });
        const j = await r.json().catch(() => null);
        setPickupResults(j?.data || []);
      } catch { setPickupResults([]); } finally { setPickupLoading(false); }
    }, 300);
  }

  async function searchDropoff(q: string) {
    setDropoffAddress(q); setDropoffLat(null); setDropoffLng(null);
    if (dropoffTimer.current) clearTimeout(dropoffTimer.current);
    if (q.length < 2) { setDropoffResults([]); return; }
    dropoffTimer.current = setTimeout(async () => {
      setDropoffLoading(true);
      try {
        const r = await fetch(buildSearchUrl(q), { cache: "no-store" });
        const j = await r.json().catch(() => null);
        setDropoffResults(j?.data || []);
      } catch { setDropoffResults([]); } finally { setDropoffLoading(false); }
    }, 300);
  }

  function saveDraft() {
    sessionStorage.setItem("camel_booking_draft", JSON.stringify({
      pickupAddress, pickupLat, pickupLng,
      dropoffAddress, dropoffLat, dropoffLng,
      pickupAt, dropoffAt, passengers, suitcases, vehicleSlug, sportEquipment, notes,
      cityKey: `${city.country}|${city.city}`,
    }));
  }

  async function handleBookNow() {
    setError(null);

    // Validation
    if (!pickupLat || !pickupLng)   { setError("Please select a pickup address from the suggestions."); return; }
    if (!dropoffLat || !dropoffLng) { setError("Please select a drop-off address from the suggestions."); return; }
    if (!pickupAt)                  { setError("Please select a pickup date and time."); return; }
    if (!dropoffAt)                 { setError("Please select a drop-off date and time."); return; }
    const duration = calculateDurationMinutes(pickupAt, dropoffAt);
    if (!duration)                  { setError("Drop-off must be at least 1 day after pickup."); return; }
    const cat = FLEET_CATEGORIES.find(c => c.slug === vehicleSlug);
    if (!cat)                       { setError("Please select a vehicle category."); return; }

    saveDraft();

    // Check auth — if not logged in, go to login and come back
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push("/login?next=/book");
      return;
    }

    // Logged in — submit directly from homepage
    setSubmitting(true);
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
          notes: notes.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create booking.");
      sessionStorage.removeItem("camel_booking_draft");
      router.push(`/bookings/${json?.data?.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to submit booking. Please try again.");
      setSubmitting(false);
    }
  }

  const inputCls  = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
  const selectCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors appearance-none cursor-pointer";
  const labelCls  = "block text-xs font-black uppercase tracking-widest text-black mb-2";
  const grouped   = citiesByCountry();

  if (submitting) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="fixed left-0 top-0 z-50 w-full bg-black">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
            <Image src="/camel-logo.png" alt="Camel" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </div>
        </nav>
        <div className="h-[68px]" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#f0f0f0] px-6 py-20">
          <div className="h-10 w-10 rounded-full border-4 border-[#ff7a00] border-t-transparent animate-spin" />
          <p className="text-base font-black text-black">Submitting your booking request…</p>
          <p className="text-sm font-semibold text-black/50">Sending to local car hire partners</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Navbar */}
      <nav className="fixed left-0 top-0 z-50 w-full bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="bg-[#ff7a00] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
      <div className="h-[68px]" />

      {/* Hero + booking widget */}
      <section className="bg-white pt-8 pb-6 lg:pt-14 lg:pb-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold leading-tight text-black sm:text-5xl lg:text-6xl xl:text-7xl">
              Meet &amp; Greet Car Hire
            </h1>
            <p className="mt-3 text-lg font-semibold text-black/60 sm:text-xl">
              Your car delivered to you, wherever you are.
            </p>
          </div>

          <div className="bg-white">
            <p className="text-2xl font-black text-black mb-3 sm:text-3xl lg:text-4xl">
              Where do you need your car?
            </p>

            {/* Error */}
            {error && (
              <div className="mb-3 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* City selector bar */}
            <div className="bg-black px-4 py-3 flex flex-wrap items-center gap-3 mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-white/60">Searching near</span>
              <select
                value={`${city.country}|${city.city}`}
                onChange={e => {
                  const [country, c] = e.target.value.split("|");
                  const found = CITIES.find(x => x.country === country && x.city === c);
                  if (found) { setCity(found); setPickupResults([]); setDropoffResults([]); }
                }}
                className="bg-[#ff7a00] text-white font-black text-sm px-3 py-1.5 outline-none cursor-pointer appearance-none [&>option]:text-black [&>optgroup]:text-black"
              >
                {Object.entries(grouped).map(([country, cities]) => (
                  <optgroup key={country} label={country}>
                    {cities.map(c => (
                      <option key={c.city} value={`${c.country}|${c.city}`}>
                        {c.city}, {c.country}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="text-xs font-semibold text-white/70">
                Change if your pickup is in a different city
              </span>
            </div>

            {/* Row 1: pickup + dropoff */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
              <div className="relative">
                <label className={labelCls}>Pickup location</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">📍</span>
                  <input value={pickupAddress} onChange={e => searchPickup(e.target.value)}
                    placeholder={`Airport, hotel, address in ${city.city}…`}
                    className={inputCls + " pl-10"} />
                  {pickupLoading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black/30">…</span>}
                </div>
                {pickupResults.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-0.5 bg-white shadow-xl overflow-hidden border border-black/10">
                    {pickupResults.map((r, i) => (
                      <ResultRow key={i} r={r} onClick={() => {
                        setPickupAddress(r.display_name); setPickupLat(r.lat); setPickupLng(r.lng); setPickupResults([]);
                      }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className={labelCls}>Drop-off location</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">🏁</span>
                  <input value={dropoffAddress} onChange={e => searchDropoff(e.target.value)}
                    placeholder="Return location (if different)"
                    className={inputCls + " pl-10"} />
                  {dropoffLoading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black/30">…</span>}
                </div>
                {dropoffResults.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-0.5 bg-white shadow-xl overflow-hidden border border-black/10">
                    {dropoffResults.map((r, i) => (
                      <ResultRow key={i} r={r} onClick={() => {
                        setDropoffAddress(r.display_name); setDropoffLat(r.lat); setDropoffLng(r.lng); setDropoffResults([]);
                      }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: dates */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Pickup date &amp; time</label>
                <input type="datetime-local" value={pickupAt} onChange={e => setPickupAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Drop-off date &amp; time</label>
                <input type="datetime-local" value={dropoffAt} onChange={e => setDropoffAt(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Row 3: passengers + suitcases + vehicle + sport */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
              <div>
                <label className={labelCls}>Passengers</label>
                <select value={passengers} onChange={e => setPassengers(Number(e.target.value))} className={selectCls}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} passenger{n>1?"s":""}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Suitcases</label>
                <select value={suitcases} onChange={e => setSuitcases(Number(e.target.value))} className={selectCls}>
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

            {/* Row 4: currency (left) + book now (right) — notes sits between on mobile */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
              <div>
                <label className={labelCls}>Booking currency</label>
                <div className="bg-[#f0f0f0] px-4 py-3">
                  <CurrencySelector variant="light" />
                </div>
              </div>

              {/* Special requirements — visible between currency and Book Now on mobile,
                  sits below currency col on desktop via row-start */}
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setNotesOpen(o => !o)}
                  className="flex items-center gap-2 text-sm font-black text-black hover:text-[#ff7a00] transition-colors"
                >
                  <span className="text-lg leading-none">{notesOpen ? "−" : "+"}</span>
                  Add special requirements
                </button>
                {notesOpen && (
                  <div className="mt-2">
                    <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Flight number, hotel name, special equipment, anything the car hire company should know…"
                      className={inputCls + " resize-none"} autoFocus />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleBookNow}
                  disabled={submitting}
                  className="w-full bg-[#ff7a00] py-5 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  Book Now →
                </button>
                <p className="text-sm font-bold text-black">
                  No account needed — sign in when you are ready to confirm
                </p>
              </div>

              {/* Desktop-only notes — shown below currency col, hidden on mobile */}
              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => setNotesOpen(o => !o)}
                  className="flex items-center gap-2 text-sm font-black text-black hover:text-[#ff7a00] transition-colors"
                >
                  <span className="text-lg leading-none">{notesOpen ? "−" : "+"}</span>
                  Add special requirements
                </button>
                {notesOpen && (
                  <div className="mt-2">
                    <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Flight number, hotel name, special equipment, anything the car hire company should know…"
                      className={inputCls + " resize-none"} autoFocus />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Camel Works */}
      <section className="bg-white pt-6 pb-8 lg:pt-10 lg:pb-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-black sm:text-4xl lg:text-5xl">How Camel works</h2>
            <p className="mt-3 text-lg font-semibold text-black max-w-xl">
              Three steps to get a car hire company delivering to you — no airport desk, no queuing.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { step: "01", title: "Submit your request", points: ["Enter your pickup and drop-off location","Choose your dates, passengers and vehicle type","Your request is sent to local car hire companies","Takes less than 2 minutes"] },
              { step: "02", title: "Receive competitive bids", points: ["Local car hire companies within range are notified","Each company submits their best price for car hire and fuel","You see full price breakdowns — no hidden extras","Compare ratings and reviews from real customers"] },
              { step: "03", title: "Accept and confirm", points: ["Choose the offer that suits you best","The full fuel deposit is taken upon booking — refunded for what you don't use","Your driver meets you at the agreed location","Confirm fuel level and insurance, take the keys and go"] },
            ].map((s, i) => (
              <div key={i} className="bg-[#f0f0f0] p-7">
                <div className="mb-4"><span className="text-3xl font-black text-black/20">{s.step}</span></div>
                <h3 className="text-xl font-black text-black mb-4">{s.title}</h3>
                <ul className="space-y-3">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-3 text-base font-semibold text-black">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-black text-white text-[10px] font-black">{j+1}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["🚗","Car delivered to your door"],["🛡️","Full insurance, zero excess"],["⛽","Pay only for fuel used"],["✅","No airport queues"]].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 bg-[#f0f0f0] px-4 py-5">
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-black text-black">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fuel system */}
      <section className="bg-[#f0f0f0] py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-black sm:text-4xl">You only pay for the fuel you use</h2>
            <p className="mt-3 text-base font-bold text-black max-w-xl">Your booking includes a full tank as a deposit. You pay only for the quarters used — the rest is refunded.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { level: "Full",    bar: 4, colour: "bg-green-500", label: "Returned full",     desc: "Full refund of deposit" },
              { level: "¾ Tank", bar: 3, colour: "bg-amber-400",  label: "Returned ¾ full",   desc: "Pay for ¼ tank only" },
              { level: "½ Tank", bar: 2, colour: "bg-orange-400", label: "Returned half full", desc: "Pay for ½ tank" },
              { level: "¼ Tank", bar: 1, colour: "bg-red-400",    label: "Returned ¼ full",   desc: "Pay for ¾ tank" },
            ].map(f => (
              <div key={f.level} className="bg-white p-6 text-center">
                <p className="text-2xl font-black text-black mb-3">{f.level}</p>
                <div className="flex gap-1.5 justify-center mb-3">
                  {[0,1,2,3].map(i => <div key={i} className={`h-3 w-10 ${i < f.bar ? f.colour : "bg-black/10"}`} />)}
                </div>
                <p className="text-sm font-black text-black">{f.label}</p>
                <p className="mt-1 text-sm font-semibold text-black/50">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No surprises + Why Book */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-[#f0f0f0] overflow-hidden">
              <div className="px-6 py-5">
                <h2 className="text-3xl font-black text-black sm:text-4xl">No surprises when you arrive</h2>
                <p className="mt-3 text-base font-semibold text-black leading-relaxed">Payment including fuel deposit is taken in full at the time of booking. When your driver arrives there is nothing left to do except confirm the fuel tank level, confirm you received your insurance documents, take the keys and go.</p>
              </div>
              <div className="px-6 pb-6">
                <ul className="space-y-4">
                  {[["🚗","Car delivered to your exact location — hotel, apartment, airport exit"],["🛡️","Full insurance with zero excess included in the price"],["⛽","Full tank on delivery — pay only for the fuel you actually use"],["📄","All paperwork completed at booking — nothing to sign on arrival"],["⭐","Reviews from real customers so you can choose with confidence"]].map(([icon, text]) => (
                    <li key={text as string} className="flex items-start gap-4 text-base font-semibold text-black">
                      <span className="text-xl shrink-0">{icon}</span><span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="bg-[#f0f0f0] px-6 py-5">
                <h3 className="text-3xl font-black text-black sm:text-4xl">Why Book a Camel Car?</h3>
                <p className="mt-1 text-sm font-bold text-black/50">How we compare to traditional car hire</p>
              </div>
              <div className="bg-[#e8e8e8] px-6 py-5">
                <p className="text-xs font-black uppercase tracking-widest text-black mb-4">Traditional car hire</p>
                <ul className="space-y-3">
                  {["Queue at airport desk — often 30–60 minutes","Surprise extras added on arrival","Fuel penalties if not returned full","Hidden insurance charges and excess fees"].map(p => (
                    <li key={p} className="flex items-center gap-3 text-base font-semibold text-black">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-black/20 text-black text-[10px] font-black">✗</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#f0f0f0] px-6 py-5">
                <p className="text-xs font-black uppercase tracking-widest text-black mb-4">Camel Global</p>
                <ul className="space-y-3">
                  {["Car delivered directly to you — no queuing","Price fixed and confirmed at booking","Pay only for the fuel you actually use","Full insurance with zero excess, always included"].map(p => (
                    <li key={p} className="flex items-center gap-3 text-base font-semibold text-black">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-green-500 text-white text-[10px] font-black">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Partner Marketing Homepage (unchanged) ────────────────────────────────────
function PartnerMarketingHome() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    setLanguage("en");
  }, []);

  function setLanguage(nextLang: Lang) {
    setLang(nextLang);
    document.documentElement.setAttribute("lang", nextLang);
    const dict = translations[nextLang] || translations.en;
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = (dict as any)[key];
      if (value) el.innerHTML = value;
    });
  }

  function toggleMobileNav() {
    const nl = document.querySelector(".nav-links"), nt = document.querySelector(".nav-toggle");
    if (!nl || !nt) return;
    nl.classList.toggle("open");
    nt.setAttribute("aria-expanded", nl.classList.contains("open") ? "true" : "false");
  }

  function closeMobileNavIfOpen() {
    const nl = document.querySelector(".nav-links"), nt = document.querySelector(".nav-toggle");
    if (!nl || !nt) return;
    if (window.innerWidth <= 880 && nl.classList.contains("open")) {
      nl.classList.remove("open");
      nt.setAttribute("aria-expanded", "false");
    }
  }

  return (
    <>
      <style>{`
        :root{--camel-blue:#005b9f;--camel-blue-dark:#003768;--camel-orange:#ff7a00;--camel-light:#e3f4ff;--camel-grey:#f5f7fa;--text-main:#1a1a1a}
        *{box-sizing:border-box}
        body{margin:0;font-family:var(--font-sans),system-ui,-apple-system,sans-serif;color:var(--text-main);background:var(--camel-light);line-height:1.6;padding-top:115px}
        img{max-width:100%;height:auto;display:block}
        a{color:var(--camel-orange);text-decoration:none}
        a:hover{text-decoration:underline}
        header{background:linear-gradient(135deg,var(--camel-blue-dark),var(--camel-blue));color:#fff;padding:.6rem 1.2rem;width:100%;position:fixed;top:0;left:0;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.25)}
        header .nav-wrapper{position:relative;max-width:1200px;margin:0 auto}
        .nav{display:flex;align-items:center;gap:.75rem;flex-wrap:nowrap}
        .logo-wrap{display:flex;align-items:center;flex-shrink:0}
        .logo-link{display:inline-flex;align-items:center}
        .logo-wrap img{height:80px;width:auto}
        .nav-right{margin-left:auto;display:flex;align-items:center;gap:.5rem;flex-shrink:0}
        .lang-select{background:rgba(0,0,0,.2);color:#fff;border:1px solid rgba(255,255,255,.5);padding:.25rem .8rem;font-size:.8rem;cursor:pointer;outline:none;appearance:none}
        .lang-select option{color:#000}
        .nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:.3rem}
        .nav-toggle-box{width:24px;height:18px;display:flex;flex-direction:column;justify-content:space-between}
        .nav-toggle-line{height:3px;background:#fff;width:100%}
        .nav-links{display:flex;flex-wrap:nowrap;gap:.75rem;font-size:.9rem;justify-content:flex-end;margin-left:1.2rem}
        .nav-links a{color:#fff;padding:.3rem .7rem;border:1px solid transparent;white-space:nowrap}
        .nav-links a:hover{border-color:rgba(255,255,255,.4);text-decoration:none}
        .hero{background:linear-gradient(135deg,rgba(0,91,159,.95),rgba(0,118,210,.95));color:#fff;padding:3.3rem 1.5rem 3rem}
        .hero-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:2.5rem;align-items:center}
        .partner-title{font-size:clamp(2rem,4vw,2.8rem);margin:0 0 1rem}
        .hero p{margin:0 0 1.25rem;font-size:1.05rem}
        .hero-highlight{font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:.85rem;opacity:.9}
        .hero-badges{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}
        .badge{padding:.35rem .9rem;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.4);font-size:.8rem;text-transform:uppercase;white-space:nowrap}
        .hero-cta{margin-top:1.5rem}
        .partner-btn{display:inline-block;padding:.8rem 1.4rem;font-weight:600;border:none;cursor:pointer;font-size:.95rem;text-align:center}
        .partner-btn-primary{background:var(--camel-orange);color:#fff}
        .hero-card{background:rgba(255,255,255,.97);color:var(--text-main);padding:1.5rem;box-shadow:0 18px 45px rgba(0,0,0,.16)}
        .hero-card h2{font-size:1.1rem;margin-top:0;margin-bottom:.75rem;color:var(--camel-blue-dark)}
        .hero-card ul{list-style:none;padding:0;margin:0 0 1rem;font-size:.9rem}
        .hero-card li::before{content:"✓";color:var(--camel-orange);font-weight:700;margin-right:.35rem}
        .hero-card li{margin-bottom:.35rem}
        .hero-card p{margin:0}
        main{background:#fff}
        section{padding:3rem 1.5rem}
        .section-inner{max-width:1200px;margin:0 auto}
        h2.section-title{font-size:1.7rem;margin-top:0;margin-bottom:.5rem;color:var(--camel-blue-dark)}
        .section-subtitle{margin:0 0 1.5rem;color:#555;font-size:.95rem;text-transform:uppercase;letter-spacing:.15em}
        .two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2rem;align-items:start}
        .pill-list{display:flex;flex-wrap:wrap;gap:.6rem;margin:1.25rem 0 0;padding:0;list-style:none;font-size:.85rem}
        .pill-list li{padding:.3rem .7rem;border:1px solid rgba(0,0,0,.08);background:var(--camel-grey)}
        .highlight-bar{padding:1rem 1.2rem;background:#fff7ed;border:1px solid #ffd8a6;font-size:.95rem}
        .cta{background:var(--camel-blue-dark);color:#fff;text-align:center;padding:3rem 1.5rem 2.5rem}
        .cta-inner{max-width:800px;margin:0 auto}
        .cta h2{margin-top:0;font-size:1.9rem}
        .cta p{margin:0 0 1rem;font-size:1rem}
        footer{background:#02182d;color:#c4d0e5;padding:1.3rem 1.5rem;font-size:.85rem}
        .footer-inner{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:space-between}
        @media(max-width:880px){
          body{padding-top:105px}
          .logo-wrap img{height:64px}
          .nav-toggle{display:block}
          .nav-links{position:absolute;top:100%;left:0;right:0;background:linear-gradient(135deg,var(--camel-blue-dark),var(--camel-blue));display:none;flex-direction:column;gap:.4rem;padding:.7rem 1.3rem 1rem;margin-left:0}
          .nav-links.open{display:flex}
          .nav-links a{padding:.55rem .8rem;background:rgba(0,0,0,.18)}
          .hero-inner{grid-template-columns:minmax(0,1fr)}
          .hero-card{margin-top:1.5rem}
          .two-col{grid-template-columns:minmax(0,1fr)}
        }
      `}</style>
      <div id="top"></div>
      <header>
        <div className="nav-wrapper">
          <div className="nav">
            <div className="logo-wrap"><a href="#top" className="logo-link" onClick={closeMobileNavIfOpen}><img src="/camel-logo.png" alt="Camel Global Ltd logo" /></a></div>
            <div className="nav-right">
              <select className="lang-select" aria-label="Language" value={lang} onChange={e=>{setLanguage(e.target.value as Lang);closeMobileNavIfOpen();}}>
                <option value="en">EN</option><option value="es">ES</option><option value="it">IT</option><option value="fr">FR</option><option value="de">DE</option>
              </select>
              <button className="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" onClick={toggleMobileNav}>
                <span className="nav-toggle-box"><span className="nav-toggle-line"/><span className="nav-toggle-line"/><span className="nav-toggle-line"/></span>
              </button>
            </div>
            <nav className="nav-links">
              <a href="#intro" data-i18n="nav_about" onClick={closeMobileNavIfOpen}>About</a>
              <a href="#concept" data-i18n="nav_concept" onClick={closeMobileNavIfOpen}>The Concept</a>
              <a href="#customer" data-i18n="nav_customer" onClick={closeMobileNavIfOpen}>Customer Journey</a>
              <a href="#partner" data-i18n="nav_partner" onClick={closeMobileNavIfOpen}>Partner Platform</a>
              <a href="#payment" data-i18n="nav_payment" onClick={closeMobileNavIfOpen}>Payment &amp; Reporting</a>
              <a href="#apps" data-i18n="nav_apps" onClick={closeMobileNavIfOpen}>Apps &amp; Screens</a>
            </nav>
          </div>
        </div>
      </header>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-highlight" data-i18n="hero_tagline">Meet &amp; Greet Car Hire – Built for the UK Market</div>
            <h1 className="partner-title" data-i18n="hero_title">NO PAPERWORK. NO QUEUING. NO HIDDEN COSTS.</h1>
            <p data-i18n="hero_p1">Camel Global Ltd is a UK company formed as a result of real car-hire experiences in Spain.</p>
            <p data-i18n="hero_p2">Think of Camel Global as <strong>"UBER for car hire"</strong> – connecting customers with trusted, off-airport car hire partners.</p>
            <div className="hero-badges">
              <div className="badge">Multi-million-pound UK marketing rollout</div>
              <div className="badge">Off-airport partners only</div>
              <div className="badge">App + Web Admin Platform</div>
            </div>
            <div className="hero-cta"><a className="partner-btn partner-btn-primary" href="/partner/login">Join the System</a></div>
          </div>
          <aside className="hero-card">
            <h2>Why customers choose Camel Global</h2>
            <ul>
              <li>Meet &amp; greet at the agreed location – no queues at airport desks.</li>
              <li>Full insurance with <strong>no excess</strong> included.</li>
              <li>Full tank of fuel on arrival – pay only for the fuel actually used.</li>
              <li>All paperwork &amp; payment completed at time of booking.</li>
              <li>Location tracking in-app to make meeting the agent effortless.</li>
            </ul>
            <p>Camel Global distributes bookings to smaller, off-airport car hire companies.</p>
          </aside>
        </div>
      </section>
      <main>
        <section id="intro">
          <div className="section-inner">
            <h2 className="section-title">Introduction</h2>
            <p className="section-subtitle">Camel Global &amp; the UK meet-and-greet opportunity</p>
            <div className="two-col">
              <div>
                <p>Camel Global Ltd is a UK-based meet-and-greet car hire platform born from real customer frustrations with traditional airport car hire.</p>
                <div className="highlight-bar">Provide a <strong>meet-and-greet car hire service</strong> with <strong>no paperwork, no queuing and no hidden costs</strong>.</div>
              </div>
              <div>
                <ul className="pill-list">
                  <li>UK-headquartered</li><li>Off-airport partners only</li>
                  <li>Customer &amp; Partner Apps</li><li>Partner Web Admin Portal</li><li>Feedback-driven system</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section id="join" className="cta">
          <div className="cta-inner">
            <h2>Join the Camel Global System</h2>
            <p>It is free for you to use, and if you are not part of it… <strong>your competitors will be!</strong></p>
            <div style={{margin:"1.5rem 0"}}>
              <a className="partner-btn partner-btn-primary" href="https://www.camel-global.com" target="_blank" rel="noreferrer">Visit www.camel-global.com</a>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="footer-inner">
          <div>&copy; <span id="year"></span> Camel Global Ltd. All rights reserved.</div>
          <div><a href="https://www.camel-global.com" target="_blank" rel="noreferrer">www.camel-global.com</a></div>
        </div>
      </footer>
    </>
  );
}

export default function Page() {
  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const hash   = window.location.hash;
      const p      = new URLSearchParams(window.location.search);
      const portal = p.get("portal");
      if (portal === "customer")    window.location.replace("/reset-password" + hash);
      else if (portal === "driver") window.location.replace("/driver/reset-password" + hash);
      else                          window.location.replace("/partner/reset-password" + hash);
      return;
    }
  }, []);

  return <CustomerHome />;
}