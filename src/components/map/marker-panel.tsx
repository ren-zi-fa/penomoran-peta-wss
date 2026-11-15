"use client";

import { useEffect, useRef } from "react";

import type { KecamatanData } from "@/lib/kecamatan";
import type { BuildingMarker } from "@/lib/markers";

interface MarkerPanelProps {
  markers: BuildingMarker[];
  selectedId: string | null;
  addMode: boolean;
  kecamatans: KecamatanData[];
  onSelect: (id: string | null) => void;
  onToggleAdd: () => void;
  onUpdateMarker: (
    id: string,
    patch: Partial<Pick<BuildingMarker, "label" | "number">>,
  ) => void;
  onDelete: (id: string) => void;
  onRenumber: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onZoomToMarker: (lat: number, lng: number) => void;
  onZoomToKecamatan: (file: string) => void;
}

export function MarkerPanel({
  markers,
  selectedId,
  addMode,
  kecamatans,
  onSelect,
  onToggleAdd,
  onUpdateMarker,
  onDelete,
  onRenumber,
  onExport,
  onImport,
  onZoomToMarker,
  onZoomToKecamatan,
}: MarkerPanelProps) {
  const selected = markers.find((m) => m.id === selectedId) ?? null;
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedId) labelRef.current?.focus();
  }, [selectedId]);

  const sorted = [...markers].sort((a, b) => a.number - b.number);

  return (
    <aside className="absolute bottom-3 right-3 top-3 z-[1100] flex w-[340px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      <header className="border-b border-zinc-200 px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-900">
          Penomoran Bangunan
        </h1>
        <p className="text-xs text-zinc-500">
          Pasaman Barat &middot; {markers.length} titik
        </p>
      </header>

      <div className="space-y-3 border-b border-zinc-200 p-3">
        <select
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700"
          value=""
          onChange={(e) => {
            if (e.target.value) onZoomToKecamatan(e.target.value);
          }}
        >
          <option value="">Zoom ke kecamatan&hellip;</option>
          {kecamatans.map((k) => (
            <option key={k.file} value={k.file}>
              {k.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleAdd}
            className={`rounded-md px-2 py-1.5 text-sm font-medium ${
              addMode
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {addMode ? "Selesai" : "+ Tambah Pin"}
          </button>
          <button
            type="button"
            onClick={onRenumber}
            disabled={markers.length === 0}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Urutkan Ulang
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={markers.length === 0}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export GeoJSON
          </button>
          <label className="flex cursor-pointer items-center justify-center rounded-md border border-zinc-300 px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Import GeoJSON
            <input
              type="file"
              accept=".json,.geojson,application/geo+json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {selected ? (
        <div className="space-y-2 border-b border-zinc-200 p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-900">
              #{selected.number}
            </span>
            <span className="truncate text-zinc-500">
              {selected.kecamatan || "Di luar batas kecamatan"}
            </span>
          </div>
          <input
            ref={labelRef}
            type="text"
            value={selected.label}
            placeholder="Nama bangunan"
            onChange={(e) =>
              onUpdateMarker(selected.id, { label: e.target.value })
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
          />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              No.
              <input
                type="number"
                min={1}
                value={selected.number}
                onChange={(e) =>
                  onUpdateMarker(selected.id, {
                    number: Number(e.target.value),
                  })
                }
                className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
              />
            </label>
            <button
              type="button"
              onClick={() => onZoomToMarker(selected.lat, selected.lng)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Zoom
            </button>
          </div>
          <button
            type="button"
            onClick={() => onDelete(selected.id)}
            className="w-full rounded-md border border-red-200 px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Hapus Pin
          </button>
        </div>
      ) : (
        <div className="border-b border-zinc-200 p-3 text-xs text-zinc-500">
          Pilih pin untuk mengedit, atau aktifkan &ldquo;Tambah Pin&rdquo; lalu
          klik peta.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <p className="p-4 text-center text-xs text-zinc-400">
            Belum ada penanda.
          </p>
        ) : (
          <ul className="space-y-1">
            {sorted.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    m.id === selectedId
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {m.number}
                  </span>
                  <span className="truncate text-zinc-800">
                    {m.label || "Tanpa nama"}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-zinc-400">
                    {m.kecamatan}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
