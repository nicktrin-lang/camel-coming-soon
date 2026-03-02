import { NextResponse } from "next/server";

export const runtime = "nodejs";

function nominatimHeaders() {
  return {
    // Nominatim requires a User-Agent
    "User-Agent": "camel-portal/1.0 (partner geocoding)",
    Accept: "application/json",
  } as const;
}

/**
 * GET /api/geocode?q=...
 * Returns a list of results (good for autocomplete/search UI)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: nominatimHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Geocode failed: ${res.status} ${text}` },
        { status: 500 }
      );
    }

    const json = await res.json();
    return NextResponse.json({ data: json }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/geocode  { address: "..." }
 * Returns a single best match in the shape your profile page expects:
 * { formatted_address, lat, lng }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { address?: string }
      | null;

    const address = (body?.address || "").trim();
    if (!address) {
      return NextResponse.json(
        { error: "Address is required." },
        { status: 400 }
      );
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: nominatimHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Geocode failed: ${res.status} ${text}` },
        { status: 500 }
      );
    }

    const json = (await res.json().catch(() => null)) as any[] | null;

    if (!json || !Array.isArray(json) || json.length === 0) {
      return NextResponse.json(
        { error: "No results found for that address." },
        { status: 400 }
      );
    }

    const top = json[0];
    const formatted_address = String(top.display_name || address);
    const lat = Number(top.lat);
    const lng = Number(top.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Geocode returned invalid coordinates." },
        { status: 500 }
      );
    }

    return NextResponse.json({ formatted_address, lat, lng }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}