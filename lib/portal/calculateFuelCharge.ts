/**
 * Fuel charge calculation
 * 
 * Model:
 * - Customer is charged full tank price at booking (fuel_price from bid)
 * - At return, fuel used is calculated in quarter-tank increments
 * - Customer is refunded the unused portion
 * 
 * Quarter values:
 * empty   = 0 quarters
 * quarter = 1 quarter
 * half    = 2 quarters
 * 3/4     = 3 quarters
 * full    = 4 quarters
 */

const FUEL_QUARTERS: Record<string, number> = {
  empty: 0,
  quarter: 1,
  half: 2,
  "3/4": 3,
  full: 4,
};

export function normalizeFuel(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s === "empty") return "empty";
  if (s === "quarter") return "quarter";
  if (s === "half") return "half";
  if (s === "three_quarter" || s === "3/4") return "3/4";
  if (s === "full") return "full";
  return null;
}

export function fuelToQuarters(level: unknown): number | null {
  const n = normalizeFuel(level);
  if (!n) return null;
  return FUEL_QUARTERS[n] ?? null;
}

export function quartersToLabel(quarters: number): string {
  switch (quarters) {
    case 0: return "Empty";
    case 1: return "¼ Tank";
    case 2: return "½ Tank";
    case 3: return "¾ Tank";
    case 4: return "Full Tank";
    default: return `${quarters}/4`;
  }
}

export type FuelChargeResult = {
  collection_quarters: number;
  return_quarters: number;
  used_quarters: number;
  price_per_quarter: number;
  fuel_charge: number;   // what customer pays
  fuel_refund: number;   // what customer gets back
  full_tank_price: number;
};

export function calculateFuelCharge(opts: {
  collectionFuel: unknown;
  returnFuel: unknown;
  fullTankPrice: number;
}): FuelChargeResult | null {
  const collQuarters = fuelToQuarters(opts.collectionFuel);
  const retQuarters = fuelToQuarters(opts.returnFuel);

  if (collQuarters === null || retQuarters === null) return null;

  const fullTankPrice = Number(opts.fullTankPrice || 0);
  const pricePerQuarter = fullTankPrice / 4;

  // Quarters used = collection level minus return level (clamped to 0 minimum)
  const usedQuarters = Math.max(0, collQuarters - retQuarters);

  const fuelCharge = Math.round(usedQuarters * pricePerQuarter * 100) / 100;
  const fuelRefund = Math.round((fullTankPrice - fuelCharge) * 100) / 100;

  return {
    collection_quarters: collQuarters,
    return_quarters: retQuarters,
    used_quarters: usedQuarters,
    price_per_quarter: Math.round(pricePerQuarter * 100) / 100,
    fuel_charge: fuelCharge,
    fuel_refund: fuelRefund,
    full_tank_price: fullTankPrice,
  };
}