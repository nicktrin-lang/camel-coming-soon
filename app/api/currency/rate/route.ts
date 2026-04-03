import { NextResponse } from "next/server";

// Cache the rate for 1 hour
let cachedRate: number | null = null;
let cacheExpiry = 0;

export async function GET() {
  const now = Date.now();

  if (cachedRate && now < cacheExpiry) {
    return NextResponse.json({ rate: cachedRate, cached: true });
  }

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("Frankfurter unavailable");

    const data = await res.json();
    const rate = Number(data?.rates?.GBP);

    if (!rate || isNaN(rate)) throw new Error("Invalid rate");

    cachedRate = rate;
    cacheExpiry = now + 60 * 60 * 1000;

    return NextResponse.json({ rate, cached: false });
  } catch {
    return NextResponse.json({ rate: cachedRate ?? 0.85, cached: true, fallback: true });
  }
}