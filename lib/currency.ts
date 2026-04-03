/**
 * Currency utilities for Camel Global
 *
 * - All partner prices are stored and displayed in EUR
 * - Customers can pay in EUR or GBP
 * - Live exchange rates from frankfurter.app (no API key required)
 * - Rates are cached for 1 hour to avoid hammering the API
 */

export type Currency = "EUR" | "GBP";

// ── Rate cache ────────────────────────────────────────────────────────────────

let cachedRate: number | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch live EUR → GBP rate from frankfurter.app
 * Falls back to a reasonable default if the API is unavailable
 */
export async function getEurToGbpRate(): Promise<number> {
  const now = Date.now();

  if (cachedRate && now < cacheExpiry) {
    return cachedRate;
  }

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP", {
      next: { revalidate: 3600 }, // Next.js cache for 1 hour
    });

    if (!res.ok) throw new Error("Frankfurter API unavailable");

    const data = await res.json();
    const rate = Number(data?.rates?.GBP);

    if (!rate || isNaN(rate)) throw new Error("Invalid rate response");

    cachedRate = rate;
    cacheExpiry = now + CACHE_TTL;

    return rate;
  } catch (e) {
    console.warn("Currency rate fetch failed, using fallback rate:", e);
    // Fallback rate — approximate EUR/GBP
    return cachedRate ?? 0.85;
  }
}

/**
 * Convert EUR amount to GBP using live rate
 */
export async function eurToGbp(amountEur: number): Promise<number> {
  const rate = await getEurToGbpRate();
  return Math.round(amountEur * rate * 100) / 100;
}

/**
 * Convert GBP amount to EUR using live rate
 */
export async function gbpToEur(amountGbp: number): Promise<number> {
  const rate = await getEurToGbpRate();
  return Math.round((amountGbp / rate) * 100) / 100;
}

/**
 * Format a number as EUR
 */
export function formatEUR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as GBP
 */
export function formatGBP(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number in the given currency
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: Currency
): string {
  if (currency === "GBP") return formatGBP(amount);
  return formatEUR(amount);
}

/**
 * Convert an EUR amount to the target currency
 */
export async function convertFromEur(
  amountEur: number,
  targetCurrency: Currency
): Promise<number> {
  if (targetCurrency === "EUR") return amountEur;
  return eurToGbp(amountEur);
}

/**
 * Format an EUR amount in the target currency (with conversion if needed)
 */
export async function formatInCurrency(
  amountEur: number | null | undefined,
  targetCurrency: Currency
): Promise<string> {
  if (amountEur == null || isNaN(amountEur)) return "—";
  if (targetCurrency === "EUR") return formatEUR(amountEur);
  const gbp = await eurToGbp(amountEur);
  return formatGBP(gbp);
}