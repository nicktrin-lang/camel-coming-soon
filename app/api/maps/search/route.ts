// ── Photon-powered address search ─────────────────────────────────────────────
// Replaces Nominatim. Uses Photon (komoot) which returns cleaner POI names,
// airport/hotel recognition, and supports lat/lon bias for city-scoped results.
// Reverse geocode (map clicks) stays on Nominatim — see /api/maps/reverse.

import { NextResponse } from "next/server";

// Map Photon OSM values to a short type label used by the frontend for icons
function resolveType(props: any): string {
  const val  = String(props?.osm_value || "").toLowerCase();
  const key  = String(props?.osm_key   || "").toLowerCase();
  if (["aerodrome", "airport"].includes(val))                     return "airport";
  if (["hotel", "motel", "hostel", "guest_house"].includes(val))  return "hotel";
  if (["restaurant", "cafe", "bar", "fast_food"].includes(val))   return "food";
  if (["train_station", "station", "halt"].includes(val))         return "train";
  if (["bus_station", "bus_stop"].includes(val))                   return "bus";
  if (key === "highway" || val === "residential")                  return "street";
  return "place";
}

// Build a short, readable label (line 1) from Photon properties
function buildLabel(props: any): string {
  const name    = String(props?.name    || "").trim();
  const street  = String(props?.street  || "").trim();
  const housenr = String(props?.housenumber || "").trim();
  // If there's a named POI, use it
  if (name) return name;
  // Otherwise build street address
  const road = [street, housenr].filter(Boolean).join(" ");
  return road || "";
}

// Build a short subtitle (line 2): district/city, country
function buildSubtitle(props: any): string {
  const district = String(props?.district || props?.suburb  || props?.quarter || "").trim();
  const city     = String(props?.city     || props?.town    || props?.village  || "").trim();
  const country  = String(props?.country  || "").trim();
  const parts    = [district, city, country].filter(Boolean);
  // Deduplicate adjacent identical segments
  const deduped  = parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
  return deduped.join(", ");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q   = String(searchParams.get("q")   || "").trim();
    const lat = searchParams.get("lat");   // city-centre bias
    const lon = searchParams.get("lon");   // city-centre bias

    if (q.length < 2) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Build Photon URL — always request English results
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lang=en`;
    if (lat && lon) {
      url += `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "CamelGlobal/1.0 (camel-global.com)" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Address search failed." }, { status: 400 });
    }

    const raw  = await res.json().catch(() => null);
    const features = Array.isArray(raw?.features) ? raw.features : [];

    const data = features
      .map((f: any) => {
        const props = f?.properties || {};
        const coords = f?.geometry?.coordinates; // [lng, lat]
        if (!coords || coords.length < 2) return null;

        const label    = buildLabel(props);
        const subtitle = buildSubtitle(props);
        if (!label) return null;

        // Full display_name stored on the booking — clear and readable
        const display_name = subtitle ? `${label}, ${subtitle}` : label;

        return {
          display_name,
          label,       // short POI/street name (line 1 in dropdown)
          subtitle,    // city, country (line 2 in dropdown)
          type: resolveType(props),
          lat:  Number(coords[1]),
          lng:  Number(coords[0]),
          // Address parts for partner profile usage
          address_line1: [String(props?.street || ""), String(props?.housenumber || "")].filter(Boolean).join(" "),
          address_line2: String(props?.district || props?.suburb || ""),
          town:          String(props?.town || props?.village || ""),
          city:          String(props?.city || ""),
          province:      String(props?.state || props?.county || ""),
          postcode:      String(props?.postcode || ""),
          country:       String(props?.country || ""),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Search failed" }, { status: 500 });
  }
}