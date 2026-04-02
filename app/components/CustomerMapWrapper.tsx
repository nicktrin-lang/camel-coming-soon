"use client";

import dynamic from "next/dynamic";

const CustomerMap = dynamic(() => import("./CustomerMap"), {
  ssr: false,
});

export default function CustomerMapWrapper({
  position,
  onSelect,
}: {
  position: any;
  onSelect?: (pos: any) => void;
}) {
  return <CustomerMap position={position} onSelect={onSelect} />;
}