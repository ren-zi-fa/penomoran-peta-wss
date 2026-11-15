"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-zinc-100">
      <div className="text-sm text-zinc-500">Memuat peta…</div>
    </div>
  ),
});

export default function MapShell() {
  return <MapView />;
}
