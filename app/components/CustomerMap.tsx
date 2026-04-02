"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useMap } from "react-leaflet";
import { useEffect } from "react";

function MapController({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom());
  }, [position, map]);

  return null;
}

// Fix marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type LatLng = {
  lat: number;
  lng: number;
};

function ClickHandler({ onClick }: { onClick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };

      console.log("CLICK", pos); // add this line HERE

      onClick(pos);
    }
  });
  return null;
}

type Props = {
  onSelect?: (pos: LatLng) => void;
};

export default function CustomerMap({
  position,
  onSelect,
}: {
  position: LatLng;
  onSelect?: (pos: LatLng) => void;
}) {

  return (
  <div style={{ height: "100vh", width: "100%", background: "red" }}>

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController position={position} />

      <ClickHandler
        onClick={(pos) => {
          if (onSelect) onSelect(pos);
        }}
      />

      <Marker position={[position.lat, position.lng]} />
    </MapContainer>
  </div>
  );
}