"use client";

/**
 * Client-side currency hook for the customer booking site
 * Fetches live EUR/GBP rate and provides formatting helpers
 */

import { useState, useEffect, useCallback } from "react";
import type { Currency } from "@/lib/currency";
import { formatEUR, formatGBP } from "@/lib/currency";

const STORAGE_KEY = "camel_currency_pref";

type UseCurrencyReturn = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number | null;        // EUR → GBP rate
  loading: boolean;
  fmt: (amountEur: number | null | undefined) => string;
  fmtEur: (amount: number | null | undefined) => string;
  fmtGbp: (amount: number | null | undefined) => string;
  convertFromEur: (amountEur: number) => number;
};

export function useCurrency(): UseCurrencyReturn {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved === "EUR" || saved === "GBP") setCurrencyState(saved);
    } catch {}
  }, []);

  // Fetch live rate
  useEffect(() => {
    let mounted = true;
    async function fetchRate() {
      setLoading(true);
      try {
        const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP");
        const data = await res.json();
        const r = Number(data?.rates?.GBP);
        if (mounted && r && !isNaN(r)) setRate(r);
      } catch {
        if (mounted) setRate(0.85); // fallback
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchRate();
    return () => { mounted = false; };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  }, []);

  const convertFromEur = useCallback((amountEur: number): number => {
    if (currency === "EUR") return amountEur;
    return Math.round(amountEur * (rate ?? 0.85) * 100) / 100;
  }, [currency, rate]);

  const fmt = useCallback((amountEur: number | null | undefined): string => {
    if (amountEur == null || isNaN(amountEur)) return "—";
    if (currency === "EUR") return formatEUR(amountEur);
    return formatGBP(Math.round(amountEur * (rate ?? 0.85) * 100) / 100);
  }, [currency, rate]);

  return {
    currency,
    setCurrency,
    rate,
    loading,
    fmt,
    fmtEur: formatEUR,
    fmtGbp: formatGBP,
    convertFromEur,
  };
}