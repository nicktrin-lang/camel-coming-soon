"use client";
import { useCurrency } from "@/lib/useCurrency";
import type { Currency } from "@/lib/currency";

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
  { value: "USD", label: "$ USD" },
];

type Props = {
  // "dark" = white text on dark nav (default)
  // "light" = dark text on white widget background
  variant?: "dark" | "light";
};

export default function CurrencySelector({ variant = "dark" }: Props) {
  const { currency, setCurrency, rates, rateIsLive, loading } = useCurrency();
  const gbpRate = rates?.GBP ?? null;

  if (variant === "light") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex rounded-lg border border-black/10 overflow-hidden">
          {CURRENCIES.map(c => (
            <button key={c.value} type="button" onClick={() => setCurrency(c.value)}
              className={[
                "flex-1 py-2.5 text-sm font-bold transition-all border-r border-black/10 last:border-r-0",
                currency === c.value
                  ? "bg-[#003768] text-white"
                  : "bg-white text-slate-600 hover:bg-[#f3f8ff] hover:text-[#003768]",
              ].join(" ")}>
              {c.label}
            </button>
          ))}
        </div>
        {!loading && gbpRate && rateIsLive && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Live rate: 1€ = £{gbpRate.toFixed(4)}
          </span>
        )}
      </div>
    );
  }

  // Default dark variant (navbar)
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-full border border-white/20 bg-white/10 p-0.5">
        {CURRENCIES.map(c => (
          <button key={c.value} type="button" onClick={() => setCurrency(c.value)}
            className={[
              "rounded-full px-3 py-1 text-xs font-bold transition-all",
              currency === c.value ? "bg-white text-[#003768]" : "text-white/80 hover:text-white",
            ].join(" ")}>
            {c.label}
          </button>
        ))}
      </div>
      {!loading && gbpRate && rateIsLive && (
        <span className="text-xs text-white/70 hidden md:inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          1€ = £{gbpRate.toFixed(4)}
        </span>
      )}
    </div>
  );
}