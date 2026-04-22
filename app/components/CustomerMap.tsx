"use client";

// This file is loaded client-side only via CustomerMapWrapper (ssr: false).
// Leaflet CSS and L.Icon fixes are safe here.
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (webpack strips asset URLs)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type LatLng = { lat: number; lng: number };

function MapController({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom());
  }, [position, map]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) { onClick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

export default function CustomerMap({
  position,
  onSelect,
}: {
  position: LatLng;
  onSelect?: (pos: LatLng) => void;
}) {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController position={position} />
        {onSelect && <ClickHandler onClick={onSelect} />}
        <Marker position={[position.lat, position.lng]} />
      </MapContainer>
    </div>
  );
}