"use client";

import dynamic from "next/dynamic";

// Leaflet must never run on the server.
// All callers already wrap this in dynamic({ ssr: false }) but the inner
// import of leaflet/dist/leaflet.css still crashes SSR — so we add a second
// ssr:false boundary here to be safe across all import paths.
const MapPickerInner = dynamic(() => import("./MapPickerInner"), { ssr: false });

type Props = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
};

export default function MapPicker(props: Props) {
  return <MapPickerInner {...props} />;
}