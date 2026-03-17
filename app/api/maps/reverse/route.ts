import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = String(searchParams.get("lat") || "").trim();
    const lng = String(searchParams.get("lng") || "").trim();

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Missing lat/lng" },
        { status: 400 }
      );
    }

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Camel Global Portal",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          data: {
            display_name: `${lat}, ${lng}`,
          },
        },
        { status: 200 }
      );
    }

    const data = await res.json().catch(() => null);

    return NextResponse.json(
      {
        data: {
          display_name:
            String(data?.display_name || "").trim() || `${lat}, ${lng}`,
        },
      },
      { status: 200 }
    );
  } catch {
    const { searchParams } = new URL(req.url);
    const lat = String(searchParams.get("lat") || "").trim();
    const lng = String(searchParams.get("lng") || "").trim();

    return NextResponse.json(
      {
        data: {
          display_name: lat && lng ? `${lat}, ${lng}` : "",
        },
      },
      { status: 200 }
    );
  }
}