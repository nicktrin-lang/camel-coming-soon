"use client";
/**
 * Client-side currency hook for the customer booking site
 * Fetches live EUR/GBP rate via our own API proxy to avoid CORS issues
 */
import { useState, useEffect, useCallback } from "react";
import type { Currency } from "@/lib/currency";
import { formatEUR, formatGBP } from "@/lib/currency";

const STORAGE_KEY = "camel_currency_pref";

type UseCurrencyReturn = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number | null;
  rateIsLive: boolean;
  loading: boolean;
  fmt: (amountEur: number | null | undefined) => string;
  fmtEur: (amount: number | null | undefined) => string;
  fmtGbp: (amount: number | null | undefined) => string;
  convertFromEur: (amountEur: number) => number;
};

export function useCurrency(): UseCurrencyReturn {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [rate, setRate] = useState<number | null>(null);
  const [rateIsLive, setRateIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved === "EUR" || saved === "GBP") setCurrencyState(saved);
    } catch {}
  }, []);

  // Fetch live rate via our proxy (avoids CORS)
  useEffect(() => {
    let mounted = true;
    async function fetchRate() {
      setLoading(true);
      try {
        const res = await fetch("/api/currency/rate", { cache: "no-store" });
        const data = await res.json();
        const r = Number(data?.rate);
        if (mounted && r && !isNaN(r)) {
          setRate(r);
          setRateIsLive(!!data?.live);
        }
      } catch {
        if (mounted) {
          setRate(0.85);
          setRateIsLive(false);
        }
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
    rateIsLive,
    loading,
    fmt,
    fmtEur: formatEUR,
    fmtGbp: formatGBP,
    convertFromEur,
  };
}