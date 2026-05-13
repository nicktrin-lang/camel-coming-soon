/**
 * Server-side currency conversion for Camel Global.
 * Used in API routes — cannot call /api/currency/rate on itself.
 * Fetches directly from frankfurter.app with in-memory cache.
 */

export type Currency = "EUR" | "GBP" | "USD";

// ── Server-side rate cache ────────────────────────────────────────────────────
let cachedRates: { GBP: number; USD: number } | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const FALLBACK: { GBP: number; USD: number } = { GBP: 0.85, USD: 1.08 };

async function getEurRates(): Promise<{ GBP: number; USD: number }> {
  const now = Date.now();
  if (cachedRates && now < cacheExpiry) return cachedRates;

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP,USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Frankfurter unavailable");
    const data = await res.json();
    const GBP = Number(data?.rates?.GBP);
    const USD = Number(data?.rates?.USD);
    if (!GBP || !USD || isNaN(GBP) || isNaN(USD)) throw new Error("Invalid rates");
    cachedRates = { GBP, USD };
    cacheExpiry = now + CACHE_TTL;
    return cachedRates;
  } catch (e) {
    console.warn("serverCurrency: rate fetch failed, using fallback", e);
    return cachedRates ?? FALLBACK;
  }
}

/**
 * Returns the exchange rate from one currency to another.
 * All rates are anchored to EUR via frankfurter.app.
 */
export async function getRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  const rates = await getEurRates();

  // EUR → X
  if (from === "EUR" && to !== "EUR") return rates[to as "GBP" | "USD"];

  // X → EUR
  if (to === "EUR" && from !== "EUR") return 1 / rates[from as "GBP" | "USD"];

  // X → Y (via EUR) e.g. GBP → USD
  return (1 / rates[from as "GBP" | "USD"]) * rates[to as "GBP" | "USD"];
}

/**
 * Converts an amount from one currency to another.
 * Returns rounded to 2 decimal places.
 */
export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): Promise<{ convertedAmount: number; rate: number }> {
  const rate = await getRate(from, to);
  const convertedAmount = Math.round(amount * rate * 100) / 100;
  return { convertedAmount, rate };
}