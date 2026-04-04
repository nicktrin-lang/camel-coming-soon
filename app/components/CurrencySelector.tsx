"use client";
import { useCurrency } from "@/lib/useCurrency";
import type { Currency } from "@/lib/currency";

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
  { value: "USD", label: "$ USD" },
];

export default function CurrencySelector() {
  const { currency, setCurrency, rates, rateIsLive, loading } = useCurrency();
  const gbpRate = rates?.GBP ?? null;

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
      {/* Only show rate when live — GBP rate as reference */}
      {!loading && gbpRate && rateIsLive && (
        <span className="text-xs text-white/70 hidden md:inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          1€ = £{gbpRate.toFixed(4)}
        </span>
      )}
    </div>
  );
}