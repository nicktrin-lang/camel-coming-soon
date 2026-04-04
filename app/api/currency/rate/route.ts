import { NextResponse } from "next/server";

let cachedRates: { GBP: number; USD: number } | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedRates && now < cacheExpiry) {
    return NextResponse.json({ rates: cachedRates, live: true, source: "cache" });
  }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP,USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Frankfurter unavailable");
    const data = await res.json();
    const GBP = Number(data?.rates?.GBP);
    const USD = Number(data?.rates?.USD);
    if (!GBP || !USD || isNaN(GBP) || isNaN(USD)) throw new Error("Invalid rate");
    cachedRates = { GBP, USD };
    cacheExpiry = now + CACHE_TTL;
    // Also expose single rate for backwards compat
    return NextResponse.json({ rate: GBP, rates: { GBP, USD }, live: true, source: "frankfurter.app" });
  } catch (e) {
    return NextResponse.json({
      rate: cachedRates?.GBP ?? 0.85,
      rates: cachedRates ?? { GBP: 0.85, USD: 1.08 },
      live: false, source: "fallback",
    });
  }
}