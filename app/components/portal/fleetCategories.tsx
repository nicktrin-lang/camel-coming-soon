export type FleetCategory = {
  slug: string;
  name: string;
  max_passengers: number;
  max_suitcases: number;
  max_hand_luggage: number;
  service_level: "standard" | "executive" | "luxury" | "minibus";
};

export const FLEET_CATEGORIES: FleetCategory[] = [
  {
    slug: "standard-saloon",
    name: "Standard Saloon",
    max_passengers: 4,
    max_suitcases: 2,
    max_hand_luggage: 2,
    service_level: "standard",
  },
  {
    slug: "estate",
    name: "Estate",
    max_passengers: 4,
    max_suitcases: 4,
    max_hand_luggage: 2,
    service_level: "standard",
  },
  {
    slug: "executive-saloon",
    name: "Executive Saloon",
    max_passengers: 4,
    max_suitcases: 2,
    max_hand_luggage: 2,
    service_level: "executive",
  },
  {
    slug: "mpv-5",
    name: "MPV 5 Seater",
    max_passengers: 5,
    max_suitcases: 4,
    max_hand_luggage: 3,
    service_level: "standard",
  },
  {
    slug: "mpv-7",
    name: "MPV 7 Seater",
    max_passengers: 7,
    max_suitcases: 5,
    max_hand_luggage: 4,
    service_level: "standard",
  },
  {
    slug: "minivan-8",
    name: "8 Seater Minivan",
    max_passengers: 8,
    max_suitcases: 8,
    max_hand_luggage: 4,
    service_level: "standard",
  },
  {
    slug: "executive-van",
    name: "Executive Van",
    max_passengers: 8,
    max_suitcases: 8,
    max_hand_luggage: 4,
    service_level: "executive",
  },
  {
    slug: "luxury",
    name: "Luxury",
    max_passengers: 4,
    max_suitcases: 3,
    max_hand_luggage: 2,
    service_level: "luxury",
  },
  {
    slug: "minibus",
    name: "Minibus",
    max_passengers: 16,
    max_suitcases: 16,
    max_hand_luggage: 8,
    service_level: "minibus",
  },
];