"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Next (Leaflet expects images in a different place)
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

function ClickHandler(props: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      props.onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker(props: {
  valueLat: number | null;
  valueLng: number | null;
  onChange: (lat: number, lng: number, address?: string) => void;

  // optional: prefill/search text
  initialQuery?: string | null;
}) {
  const [query, setQuery] = useState(props.initialQuery || "");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const center = useMemo(() => {
    // sensible default: Spain-ish. Change if you want.
    const lat = props.valueLat ?? 38.345;
    const lng = props.valueLng ?? -0.481;
    return { lat, lng };
  }, [props.valueLat, props.valueLng]);

  async function search() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setErr(null);
    setSuggestions([]);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(json?.error || "Search failed");

      setSuggestions((json?.data || []) as Suggestion[]);
    } catch (e: any) {
      setErr(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function pick(lat: number, lng: number, address?: string) {
    props.onChange(lat, lng, address);
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Search address</label>
          <input
            className="mt-1 w-full rounded border p-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an address, city, hotel, airport…"
          />
        </div>

        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}

      {suggestions.length > 0 ? (
        <div className="mt-3 rounded border">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-b-0"
              onClick={() =>
                pick(Number(s.lat), Number(s.lon), s.display_name)
              }
            >
              {s.display_name}
              <div className="mt-1 text-xs text-gray-500">
                {Number(s.lat).toFixed(6)}, {Number(s.lon).toFixed(6)}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-lg border">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          style={{ height: 320, width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler
            onPick={(lat, lng) => pick(lat, lng)}
          />

          {props.valueLat != null && props.valueLng != null ? (
            <Marker position={[props.valueLat, props.valueLng]} />
          ) : null}
        </MapContainer>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Tip: click the map to drop a pin. That will fill lat/lng automatically.
      </p>
    </div>
  );
}