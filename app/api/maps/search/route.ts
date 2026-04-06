import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    if (q.length < 3) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Camel Global Portal" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Address search failed." }, { status: 400 });
    }

    const raw = await res.json();
    const data = (raw || []).map((item: any) => {
      const a = item.address || {};
      const house    = String(a.house_number || "").trim();
      const road     = String(a.road || a.pedestrian || a.footway || "").trim();
      const addr1    = [house, road].filter(Boolean).join(" ") || String(item.display_name || "").split(",")[0].trim();
      const addr2    = String(a.suburb || a.neighbourhood || a.quarter || "").trim();
      const town     = String(a.town || a.village || a.hamlet || "").trim();
      const city     = String(a.city || a.municipality || "").trim();
      const province = String(a.state || a.region || a.county || "").trim();
      const postcode = String(a.postcode || "").trim();
      const country  = String(a.country || "").trim();
      return {
        display_name:  String(item.display_name || ""),
        lat:           Number(item.lat),
        lng:           Number(item.lon),
        address_line1: addr1,
        address_line2: addr2,
        town,
        city,
        province,
        postcode,
        country,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Search failed" }, { status: 500 });
  }
}
