"use client";

import { useCurrency } from "@/lib/useCurrency";
import type { Currency } from "@/lib/currency";

export default function CurrencySelector() {
  const { currency, setCurrency, rate, loading } = useCurrency();

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
      {rate && !loading && (
        <span className="text-xs text-white/50 hidden md:block">
          1€ = £{rate.toFixed(4)}
        </span>
      )}
    </div>
  );
}