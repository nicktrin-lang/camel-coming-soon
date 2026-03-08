import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const lat = (searchParams.get("lat") || "").trim();
    const lng = (searchParams.get("lng") || "").trim();

    // Reverse geocode
    if (lat && lng) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Camel Global Portal",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: "Reverse geocoding request failed" },
          { status: 500 }
        );
      }

      const data = await res.json();

      return NextResponse.json(
        {
          display_name: data?.display_name || "",
          lat: data?.lat ? Number(data.lat) : null,
          lng: data?.lon ? Number(data.lon) : null,
        },
        { status: 200 }
      );
    }

    // Search geocode
    if (!q) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Camel Global Portal",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding request failed" },
        { status: 500 }
      );
    }

    const data = await res.json();

    const results = Array.isArray(data)
      ? data.map((item: any) => ({
          display_name: item.display_name || "",
          lat: item.lat ? Number(item.lat) : null,
          lng: item.lon ? Number(item.lon) : null,
        }))
      : [];

    return NextResponse.json({ results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}