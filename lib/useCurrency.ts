"use client";
import { useState, useEffect, useCallback } from "react";
import type { Currency } from "@/lib/currency";
import { formatEUR, formatGBP, formatUSD } from "@/lib/currency";

const STORAGE_KEY = "camel_currency_pref";

type Rates = { GBP: number; USD: number };

type UseCurrencyReturn = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number | null;       // EUR → GBP (backwards compat)
  rates: Rates | null;       // all rates from EUR
  rateIsLive: boolean;
  loading: boolean;
  fmt: (amountEur: number | null | undefined) => string;
  fmtEur: (amount: number | null | undefined) => string;
  fmtGbp: (amount: number | null | undefined) => string;
  convertFromEur: (amountEur: number) => number;
};

export function useCurrency(): UseCurrencyReturn {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [rates, setRates] = useState<Rates | null>(null);
  const [rateIsLive, setRateIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved === "EUR" || saved === "GBP" || saved === "USD") setCurrencyState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchRates() {
      setLoading(true);
      try {
        const res = await fetch("/api/currency/rate", { cache: "no-store" });
        const data = await res.json();
        if (mounted && data?.rates) {
          setRates({ GBP: Number(data.rates.GBP) || 0.85, USD: Number(data.rates.USD) || 1.08 });
          setRateIsLive(!!data?.live);
        }
      } catch {
        if (mounted) setRates({ GBP: 0.85, USD: 1.08 });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchRates();
    return () => { mounted = false; };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  }, []);

  const getRate = useCallback((to: Currency): number => {
    if (to === "EUR") return 1;
    if (to === "GBP") return rates?.GBP ?? 0.85;
    return rates?.USD ?? 1.08;
  }, [rates]);

  const convertFromEur = useCallback((amountEur: number): number => {
    return Math.round(amountEur * getRate(currency) * 100) / 100;
  }, [currency, getRate]);

  const fmt = useCallback((amountEur: number | null | undefined): string => {
    if (amountEur == null || isNaN(amountEur)) return "—";
    const converted = Math.round(amountEur * getRate(currency) * 100) / 100;
    if (currency === "GBP") return formatGBP(converted);
    if (currency === "USD") return formatUSD(converted);
    return formatEUR(amountEur);
  }, [currency, getRate]);

  return {
    currency,
    setCurrency,
    rate: rates?.GBP ?? null,
    rates,
    rateIsLive,
    loading,
    fmt,
    fmtEur: formatEUR,
    fmtGbp: formatGBP,
    convertFromEur,
  };
}