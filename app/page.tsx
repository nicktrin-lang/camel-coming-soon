"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { translations } from "./marketing/translations";

type Lang = keyof typeof translations;

// ── Customer Homepage (test.camel-global.com) ────────────────────────────────

type AddressResult = { display_name: string; lat: number; lng: number };

function CustomerHome() {
  const router = useRouter();

  // Booking widget state
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

  const [pickupResults,  setPickupResults]  = useState<AddressResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<AddressResult[]>([]);
  const [pickupLoading,  setPickupLoading]  = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);

  const pickupTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle password reset token redirect
  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const hash   = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const portal = params.get("portal");
      if (portal === "customer") {
        window.location.replace("/reset-password" + hash);
      } else if (portal === "driver") {
        window.location.replace("/driver/reset-password" + hash);
      } else {
        window.location.replace("/partner/reset-password" + hash);
      }
    }
  }, []);

  async function searchPickup(q: string) {
    setPickupAddress(q);
    setPickupLat(null); setPickupLng(null);
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

  async function searchDropoff(q: string) {
    setDropoffAddress(q);
    setDropoffLat(null); setDropoffLng(null);
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

  function selectPickup(r: AddressResult) {
    setPickupAddress(r.display_name);
    setPickupLat(r.lat); setPickupLng(r.lng);
    setPickupResults([]);
  }

  function selectDropoff(r: AddressResult) {
    setDropoffAddress(r.display_name);
    setDropoffLat(r.lat); setDropoffLng(r.lng);
    setDropoffResults([]);
  }

  function handleBookNow() {
    // Save widget state to sessionStorage so /book page can pre-fill
    sessionStorage.setItem("camel_booking_draft", JSON.stringify({
      pickupAddress, pickupLat, pickupLng,
      dropoffAddress, dropoffLat, dropoffLng,
      pickupAt, dropoffAt, passengers, suitcases,
    }));
    router.push("/book");
  }

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="fixed left-0 top-0 z-50 w-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel" width={160} height={56} priority className="h-12 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full border border-[#003768]/20 px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-[#003768]/5 transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,122,0,0.3)] hover:opacity-95 transition-opacity">
              Create Account
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero + Booking Widget ── */}
      <section className="bg-white pt-20">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

            {/* Left — headline */}
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#ff7a00]">Meet &amp; Greet Car Hire</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-[#003768] sm:text-5xl lg:text-6xl">
                Book your meet &amp; greet car hire
              </h1>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                Car delivered to you, wherever you are. No queues. No hidden costs. Full insurance included.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
                {["✓ Car delivered to your location", "✓ Full insurance, zero excess", "✓ Pay only for fuel used", "✓ No airport queues"].map(f => (
                  <span key={f} className="font-medium">{f}</span>
                ))}
              </div>
            </div>

            {/* Right — booking widget */}
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(0,55,104,0.12)]">
              <h2 className="text-xl font-bold text-[#003768] mb-5">Where do you need your car?</h2>

              {/* Pickup */}
              <div className="relative mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Pickup location</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff7a00] text-lg">📍</span>
                  <input
                    value={pickupAddress}
                    onChange={e => searchPickup(e.target.value)}
                    placeholder="Airport, hotel, address…"
                    className="w-full rounded-xl border border-black/10 py-3 pl-9 pr-4 text-sm outline-none focus:border-[#003768] focus:ring-2 focus:ring-[#003768]/10"
                  />
                  {pickupLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>}
                </div>
                {pickupResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden">
                    {pickupResults.map((r, i) => (
                      <button key={i} type="button" onClick={() => selectPickup(r)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-[#f3f8ff] border-b border-black/5 last:border-b-0">
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropoff */}
              <div className="relative mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Drop-off location</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🏁</span>
                  <input
                    value={dropoffAddress}
                    onChange={e => searchDropoff(e.target.value)}
                    placeholder="Return location (if different)"
                    className="w-full rounded-xl border border-black/10 py-3 pl-9 pr-4 text-sm outline-none focus:border-[#003768] focus:ring-2 focus:ring-[#003768]/10"
                  />
                  {dropoffLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>}
                </div>
                {dropoffResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden">
                    {dropoffResults.map((r, i) => (
                      <button key={i} type="button" onClick={() => selectDropoff(r)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-[#f3f8ff] border-b border-black/5 last:border-b-0">
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Pickup date &amp; time</label>
                  <input type="datetime-local" value={pickupAt} onChange={e => setPickupAt(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#003768]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Drop-off date &amp; time</label>
                  <input type="datetime-local" value={dropoffAt} onChange={e => setDropoffAt(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#003768]" />
                </div>
              </div>

              {/* Passengers + bags */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Passengers</label>
                  <select value={passengers} onChange={e => setPassengers(Number(e.target.value))}
                    className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm bg-white outline-none focus:border-[#003768]">
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} passenger{n > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Suitcases</label>
                  <select value={suitcases} onChange={e => setSuitcases(Number(e.target.value))}
                    className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm bg-white outline-none focus:border-[#003768]">
                    {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} suitcase{n !== 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              </div>

              {/* CTA */}
              <button type="button" onClick={handleBookNow}
                className="w-full rounded-2xl bg-[#ff7a00] py-4 text-base font-black text-white shadow-[0_8px_24px_rgba(255,122,0,0.35)] hover:opacity-95 active:scale-[0.99] transition-all">
                Book Now →
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">No account needed to start — sign in when you're ready to confirm</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How Camel Works ── */}
      <section className="bg-[#f7f9fc] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-[#ff7a00]">Simple &amp; transparent</p>
            <h2 className="mt-2 text-3xl font-black text-[#003768] sm:text-4xl">How Camel works</h2>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">Three simple steps to get a car hire company delivering to you — no airport desk, no queuing.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", icon: "📋", title: "Submit your request", desc: "Tell us where and when you need your car. Enter your pickup location, drop-off, dates, and the number of passengers. It takes less than 2 minutes." },
              { step: "2", icon: "💬", title: "Receive bids", desc: "Local, trusted car hire companies within range of your location are notified and send you their best prices. You see the full breakdown — car hire, fuel deposit, insurance." },
              { step: "3", icon: "✅", title: "Accept &amp; confirm", desc: "Choose the offer that suits you best, accept it, and your booking is confirmed. Your driver will meet you at the agreed location with the keys ready to go." },
            ].map(s => (
              <div key={s.step} className="rounded-3xl bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003768] text-2xl font-black text-[#ff7a00] mb-5">{s.step}</div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-lg font-bold text-[#003768] mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: s.desc }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#ff7a00]">Everything included</p>
              <h2 className="mt-2 text-3xl font-black text-[#003768] sm:text-4xl">No surprises when you arrive</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Every Camel booking includes everything upfront. Payment is taken in full at the time of booking, so when your driver arrives there is nothing left to do except take the keys and go.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  ["🚗", "Car delivered to your exact location — hotel, apartment, airport exit"],
                  ["🛡️", "Full insurance with zero excess included in the price"],
                  ["⛽", "Full tank on delivery — you pay only for the fuel you actually use"],
                  ["📄", "All paperwork completed at booking — nothing to sign on arrival"],
                  ["⭐", "Reviews from real customers so you can choose with confidence"],
                ].map(([icon, text]) => (
                  <li key={text as string} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="text-xl shrink-0">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-[#003768] p-8 text-white">
              <h3 className="text-xl font-bold mb-6">The Camel difference</h3>
              <div className="space-y-4">
                {[
                  { label: "Traditional car hire", bad: true, points: ["Queue at airport desk", "Surprise extras on arrival", "Fuel penalties", "Hidden insurance charges"] },
                  { label: "Camel Global", bad: false, points: ["Car delivered to you", "Price fixed at booking", "Pay only fuel used", "Full insurance included"] },
                ].map(col => (
                  <div key={col.label} className={`rounded-2xl p-5 ${col.bad ? "bg-white/10" : "bg-[#ff7a00]/20 border border-[#ff7a00]/40"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${col.bad ? "text-white/60" : "text-[#ff7a00]"}`}>{col.label}</p>
                    <ul className="space-y-1.5">
                      {col.points.map(p => (
                        <li key={p} className="flex items-center gap-2 text-sm">
                          <span>{col.bad ? "✗" : "✓"}</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fuel system explained ── */}
      <section className="bg-[#f7f9fc] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-[#ff7a00]">Transparent fuel policy</p>
            <h2 className="mt-2 text-3xl font-black text-[#003768] sm:text-4xl">You only pay for the fuel you use</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Your car hire price includes a full tank of fuel as a deposit. When you return the car, the driver records the remaining fuel level. You pay only for the quarters used — the rest is refunded.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-4">
            {[
              { level: "Full", bar: 4, label: "Returned full", desc: "Full refund of fuel deposit" },
              { level: "¾ Tank", bar: 3, label: "Returned ¾ full", desc: "You pay for ¼ tank only" },
              { level: "½ Tank", bar: 2, label: "Returned half full", desc: "You pay for ½ tank" },
              { level: "¼ Tank", bar: 1, label: "Returned ¼ full", desc: "You pay for ¾ tank" },
            ].map(f => (
              <div key={f.level} className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/5 text-center">
                <p className="text-2xl font-black text-[#003768] mb-3">{f.level}</p>
                <div className="flex gap-1 justify-center mb-3">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`h-3 w-8 rounded-full ${i < f.bar ? "bg-green-500" : "bg-slate-200"}`} />
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-700">{f.label}</p>
                <p className="mt-1 text-xs text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="bg-[#003768] py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to book your car?</h2>
          <p className="mt-3 text-white/70">No account needed to start. Enter your details above or click below.</p>
          <Link href="/book" className="mt-8 inline-block rounded-2xl bg-[#ff7a00] px-10 py-4 text-base font-black text-white shadow-[0_8px_24px_rgba(255,122,0,0.4)] hover:opacity-95 transition-opacity">
            Book Now →
          </Link>
          <p className="mt-4 text-sm text-white/50">
            Already have an account? <Link href="/login" className="text-white/80 underline hover:text-white">Sign in</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#02182d] text-[#c4d0e5] py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div>
              <Image src="/camel-logo.png" alt="Camel" width={120} height={40} className="h-10 w-auto mb-3 brightness-0 invert" />
              <p className="text-sm text-white/60">Meet &amp; greet car hire, delivered to your door.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Company</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/partner/signup" className="hover:text-white transition-colors">Become a Partner</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Customer Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Account</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
                <li><Link href="/bookings" className="hover:text-white transition-colors">My Bookings</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/40">
            <span>© {new Date().getFullYear()} Camel Global Ltd. All rights reserved.</span>
            <span>Registered in England &amp; Wales — registration details to be updated</span>
          </div>
        </div>
      </footer>
    </>
  );
}

// ── Partner Marketing Homepage (camel-global.com) ────────────────────────────
// (unchanged from original — keeping full implementation)

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
    const navLinks  = document.querySelector(".nav-links");
    const navToggle = document.querySelector(".nav-toggle");
    if (!navLinks || !navToggle) return;
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeMobileNavIfOpen() {
    const navLinks  = document.querySelector(".nav-links");
    const navToggle = document.querySelector(".nav-toggle");
    if (!navLinks || !navToggle) return;
    if (window.innerWidth <= 880 && navLinks.classList.contains("open")) {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  }

  return (
    <>
      <style>{`
        :root { --camel-blue:#005b9f;--camel-blue-dark:#003768;--camel-orange:#ff7a00;--camel-light:#e3f4ff;--camel-grey:#f5f7fa;--text-main:#1a1a1a; }
        *{box-sizing:border-box}
        body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--text-main);background:var(--camel-light);line-height:1.6;padding-top:115px}
        img{max-width:100%;height:auto;display:block}
        a{color:var(--camel-orange);text-decoration:none}
        a:hover{text-decoration:underline}
        header{background:linear-gradient(135deg,var(--camel-blue-dark),var(--camel-blue));color:#fff;padding:.6rem 1.2rem;width:100%;position:fixed;top:0;left:0;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.25)}
        header .nav-wrapper{position:relative;max-width:1200px;margin:0 auto}
        .nav{display:flex;align-items:center;justify-content:flex-start;gap:.75rem;flex-wrap:nowrap}
        .logo-wrap{display:flex;align-items:center;flex-shrink:0}
        .logo-link{display:inline-flex;align-items:center}
        .logo-wrap img{height:80px;width:auto}
        .nav-right{margin-left:auto;display:flex;align-items:center;gap:.5rem;flex-shrink:0}
        .lang-switch{position:relative}
        .lang-select{background:rgba(0,0,0,.2);color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:.25rem .8rem;font-size:.8rem;cursor:pointer;outline:none;appearance:none}
        .lang-select option{color:#000}
        .nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:.3rem}
        .nav-toggle-box{width:24px;height:18px;display:flex;flex-direction:column;justify-content:space-between}
        .nav-toggle-line{height:3px;border-radius:3px;background:#fff;width:100%}
        .nav-links{display:flex;flex-wrap:nowrap;gap:.75rem;font-size:.9rem;justify-content:flex-end;margin-left:1.2rem}
        .nav-links a{color:#fff;padding:.3rem .7rem;border-radius:999px;border:1px solid transparent;white-space:nowrap}
        .nav-links a:hover{border-color:rgba(255,255,255,.4);text-decoration:none}
        .hero{background:linear-gradient(135deg,rgba(0,91,159,.95),rgba(0,118,210,.95));color:#fff;padding:3.3rem 1.5rem 3rem}
        .hero-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:2.5rem;align-items:center}
        .partner-title{font-size:clamp(2rem,4vw,2.8rem);margin:0 0 1rem}
        .hero p{margin:0 0 1.25rem;font-size:1.05rem}
        .hero-highlight{font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:.85rem;opacity:.9}
        .hero-badges{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}
        .badge{padding:.35rem .9rem;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.4);font-size:.8rem;text-transform:uppercase;white-space:nowrap}
        .hero-cta{margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
        .partner-btn{display:inline-block;padding:.8rem 1.4rem;border-radius:999px;font-weight:600;border:none;cursor:pointer;font-size:.95rem;text-align:center}
        .partner-btn-primary{background:var(--camel-orange);color:#fff;box-shadow:0 8px 18px rgba(0,0,0,.18)}
        .hero-card{background:rgba(255,255,255,.97);color:var(--text-main);border-radius:1.2rem;padding:1.5rem;box-shadow:0 18px 45px rgba(0,0,0,.16)}
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
        .two-col{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,3fr);gap:2rem;align-items:start}
        .pill-list{display:flex;flex-wrap:wrap;gap:.6rem;margin:1.25rem 0 0;padding:0;list-style:none;font-size:.85rem}
        .pill-list li{padding:.3rem .7rem;border-radius:999px;border:1px solid rgba(0,0,0,.08);background:var(--camel-grey)}
        .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem;margin-top:1.5rem}
        .card{background:#fff;border-radius:1rem;padding:1.2rem 1.3rem;box-shadow:0 10px 26px rgba(0,0,0,.07);border:1px solid rgba(0,0,0,.04)}
        .card h3{margin-top:0;margin-bottom:.75rem;font-size:1.05rem;color:var(--camel-blue)}
        .card p{margin:0 0 .5rem;font-size:.95rem}
        .card ul{padding-left:1.1rem;margin:.25rem 0 0;font-size:.93rem}
        .steps{counter-reset:steps;list-style:none;padding:0;margin:0}
        .steps li{counter-increment:steps;margin-bottom:1rem;padding-left:2.5rem;position:relative;font-size:.96rem}
        .steps li::before{content:counter(steps);position:absolute;left:0;top:.15rem;width:1.6rem;height:1.6rem;border-radius:999px;background:var(--camel-orange);color:#fff;font-size:.9rem;display:flex;align-items:center;justify-content:center;font-weight:600}
        .highlight-bar{padding:1rem 1.2rem;border-radius:.9rem;background:#fff7ed;border:1px solid #ffd8a6;font-size:.95rem}
        .screens-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;margin-top:1.5rem}
        figure{margin:0;background:#fff;border-radius:.9rem;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.07);border:1px solid rgba(0,0,0,.04);display:flex;flex-direction:column;height:100%}
        figure img{flex:1 1 auto;object-fit:cover}
        figcaption{padding:.7rem .9rem;font-size:.9rem;background:var(--camel-grey)}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1.5rem}
        .kpi{padding:1rem 1.1rem;border-radius:.9rem;background:var(--camel-blue-dark);color:#fff;font-size:.9rem}
        .kpi strong{display:block;font-size:1.05rem;margin-bottom:.3rem}
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
          .nav-links a{padding:.55rem .8rem;border-radius:.6rem;background:rgba(0,0,0,.18)}
          .hero-inner{grid-template-columns:minmax(0,1fr)}
          .hero-card{margin-top:1.5rem}
          .two-col{grid-template-columns:minmax(0,1fr)}
        }
      `}</style>

      <div id="top"></div>
      <header>
        <div className="nav-wrapper">
          <div className="nav">
            <div className="logo-wrap">
              <a href="#top" className="logo-link" onClick={closeMobileNavIfOpen}>
                <img src="/camel-logo.png" alt="Camel Global Ltd logo" />
              </a>
            </div>
            <div className="nav-right">
              <div className="lang-switch">
                <select id="lang-select" className="lang-select" aria-label="Language selector" value={lang}
                  onChange={e => { setLanguage(e.target.value as Lang); closeMobileNavIfOpen(); }}>
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="it">IT</option>
                  <option value="fr">FR</option>
                  <option value="de">DE</option>
                </select>
              </div>
              <button className="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" onClick={toggleMobileNav}>
                <span className="nav-toggle-box">
                  <span className="nav-toggle-line"></span>
                  <span className="nav-toggle-line"></span>
                  <span className="nav-toggle-line"></span>
                </span>
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
            <p data-i18n="hero_p1">Camel Global Ltd is a UK company formed as a result of real car-hire experiences in Spain. We are an online meet-and-greet car hire platform built solely for customers and partners, delivering the car hire service the British public actually wants.</p>
            <p data-i18n="hero_p2">Think of Camel Global as <strong>"UBER for car hire"</strong> – connecting customers with trusted, off-airport car hire partners via our customer app, partner app and web admin portal.</p>
            <div className="hero-badges">
              <div className="badge" data-i18n="hero_badge1">Multi-million-pound UK marketing rollout</div>
              <div className="badge" data-i18n="hero_badge2">Off-airport partners only</div>
              <div className="badge" data-i18n="hero_badge3">App + Web Admin Platform</div>
            </div>
            <div className="hero-cta">
              <a className="partner-btn partner-btn-primary" href="/partner/login" onClick={closeMobileNavIfOpen}>Join the System</a>
            </div>
          </div>
          <aside className="hero-card">
            <h2 data-i18n="hero_box_title">Why customers choose Camel Global</h2>
            <ul>
              <li data-i18n="hero_box_li1">Meet &amp; greet at the agreed location – no queues at airport desks.</li>
              <li data-i18n="hero_box_li2">Full insurance with <strong>no excess</strong> included.</li>
              <li data-i18n="hero_box_li3">Full tank of fuel on arrival – pay only for the fuel actually used.</li>
              <li data-i18n="hero_box_li4">All paperwork &amp; payment completed at time of booking.</li>
              <li data-i18n="hero_box_li5">Location tracking in-app to make meeting the agent effortless.</li>
            </ul>
            <p data-i18n="hero_box_p">Camel Global distributes bookings to smaller, off-airport car hire companies, giving customers the exact experience they want – and partners the business they deserve.</p>
          </aside>
        </div>
      </section>

      <main>
        <section id="intro">
          <div className="section-inner">
            <h2 className="section-title" data-i18n="intro_title">Introduction</h2>
            <p className="section-subtitle" data-i18n="intro_subtitle">Camel Global &amp; the UK meet-and-greet opportunity</p>
            <div className="two-col">
              <div>
                <p data-i18n="intro_p1">Camel Global Ltd is a UK-based meet-and-greet car hire platform born from real customer frustrations with traditional airport car hire – long queues, piles of paperwork, and unexpected extra costs on arrival.</p>
                <div className="highlight-bar" data-i18n="intro_highlight">Provide a <strong>meet-and-greet car hire service</strong> with <strong>no paperwork, no queuing and no hidden costs</strong>, where customers are willing to pay a premium for simplicity and transparency.</div>
                <p style={{ marginTop: "1rem" }} data-i18n="intro_p2">The platform has been built to bring car hire customers and car hire partners together. Customers enjoy the frictionless experience they want, while partners gain a powerful new channel for quality business.</p>
              </div>
              <div>
                <p data-i18n="intro_defs_title"><strong>Key definitions used throughout this site:</strong></p>
                <ul>
                  <li data-i18n="intro_def_partners"><strong>Partners</strong> – Car hire companies.</li>
                  <li data-i18n="intro_def_agents"><strong>Agents</strong> – Partner delivery / collection drivers.</li>
                </ul>
                <ul className="pill-list">
                  <li data-i18n="intro_pill1">UK-headquartered</li>
                  <li data-i18n="intro_pill2">Off-airport partners only</li>
                  <li data-i18n="intro_pill3">Customer &amp; Partner Apps</li>
                  <li data-i18n="intro_pill4">Partner Web Admin Portal</li>
                  <li data-i18n="intro_pill5">Feedback-driven system</li>
                  <li data-i18n="intro_pill6">European Law–compliant client accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="join" className="cta">
          <div className="cta-inner">
            <h2 data-i18n="join_title">Summary &amp; Join the Camel Global System</h2>
            <p data-i18n="join_p1">A multi-million-pound marketing budget is in place to roll this out across the UK in the coming months. Sign up and be part of the Camel Global meet and greet car hire system.</p>
            <p data-i18n="join_p2">It's free for you to use, and if you're not part of it… <strong>your competitors will be!</strong></p>
            <div style={{ margin: "1.5rem 0" }}>
              <a className="partner-btn partner-btn-primary" href="https://www.camel-global.com" target="_blank" rel="noreferrer" data-i18n="join_button">Visit www.camel-global.com</a>
            </div>
            <p style={{ fontSize: ".9rem", opacity: 0.9 }} data-i18n="join_footer">Partners = Car hire companies &nbsp;|&nbsp; Agents = Car hire company delivery drivers</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner">
          <div>&copy; <span id="year"></span> Camel Global Ltd. <span data-i18n="footer_rights">All rights reserved.</span></div>
          <div><span data-i18n="footer_website_label">Website:</span> <a href="https://www.camel-global.com" target="_blank" rel="noreferrer">www.camel-global.com</a></div>
        </div>
      </footer>
    </>
  );
}

// ── Root page — hostname routing ─────────────────────────────────────────────

export default function Page() {
  const [host, setHost] = useState("");

  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const hash   = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const portal = params.get("portal");
      if (portal === "customer") {
        window.location.replace("/reset-password" + hash);
      } else if (portal === "driver") {
        window.location.replace("/driver/reset-password" + hash);
      } else {
        window.location.replace("/partner/reset-password" + hash);
      }
      return;
    }
    setHost(window.location.hostname);
  }, []);

  if (host === "test.camel-global.com" || host.includes("localhost")) {
    return <CustomerHome />;
  }

  return <PartnerMarketingHome />;
}