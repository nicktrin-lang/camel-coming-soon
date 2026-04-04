"use client";
import { useCurrency } from "@/lib/useCurrency";
import type { Currency } from "@/lib/currency";

export default function CurrencySelector() {
  const { currency, setCurrency, rate, rateIsLive, loading } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-full border border-white/20 bg-white/10 p-0.5">
        {(["EUR", "GBP"] as Currency[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            className={[
              "rounded-full px-3 py-1 text-xs font-bold transition-all",
              currency === c
                ? "bg-white text-[#003768]"
                : "text-white/80 hover:text-white",
            ].join(" ")}
          >
            {c === "EUR" ? "€ EUR" : "£ GBP"}
          </button>
        ))}
      </div>
      {/* Only show rate when live — hide completely if fallback or still loading */}
      {!loading && rate && rateIsLive && (
        <span className="text-xs text-white/70 hidden md:inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          1€ = £{rate.toFixed(4)}
        </span>
      )}
    </div>
  );
}