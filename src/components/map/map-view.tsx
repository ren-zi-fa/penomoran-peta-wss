"use client";

import "leaflet/dist/leaflet.css";

import type { FeatureCollection } from "geojson";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { findKecamatan } from "@/lib/geometry";
import { type KecamatanData, loadAllKecamatan } from "@/lib/kecamatan";
import {
  type BuildingMarker,
  loadMarkers,
  markersFromFeatureCollection,
  nextNumber,
  renumber,
  saveMarkers,
  toFeatureCollection,
  uid,
} from "@/lib/markers";

import { MarkerPanel } from "./marker-panel";

const ESRI_SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "\u00a9 Esri \u2014 Maxar, Earthstar Geographics";
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "\u00a9 OpenStreetMap contributors";

type BaseLayer = "osm" | "satellite";

const KECAMATAN_COLORS = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#65a30d",
  "#c026d3",
  "#ea580c",
  "#4f46e5",
];

function numberIcon(number: number, selected: boolean): L.DivIcon {
  const background = selected ? "#111827" : "#dc2626";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${background};color:#fff;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5);">${number}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function ClickHandler({
  active,
  onAdd,
}: {
  active: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ mapRef }: { mapRef: { current: L.Map | null } }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

export default function MapView() {
  const [markers, setMarkers] = useState<BuildingMarker[]>(() => loadMarkers());
  const [kecamatans, setKecamatans] = useState<KecamatanData[] | null>(null);
  const [pasamanBounds, setPasamanBounds] = useState<L.LatLngBounds | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseLayer, setBaseLayer] = useState<BaseLayer>("osm");

  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    saveMarkers(markers);
  }, [markers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAllKecamatan();
        if (cancelled) return;
        setKecamatans(data);
        const pasaman = data.find((k) => k.file === "pasaman");
        if (pasaman) {
          const bounds = L.geoJSON(pasaman.feature).getBounds();
          if (bounds.isValid()) setPasamanBounds(bounds);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Gagal memuat data wilayah",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-zinc-100 p-6 text-center text-sm text-zinc-600">
        Gagal memuat data wilayah: {error}
      </div>
    );
  }

  if (!kecamatans || !pasamanBounds) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-zinc-100">
        <div className="text-sm text-zinc-500">Memuat peta…</div>
      </div>
    );
  }

  const colorMap = new Map<string, string>();
  kecamatans.forEach((k, i) => {
    colorMap.set(k.name, KECAMATAN_COLORS[i % KECAMATAN_COLORS.length]);
  });

  const featureCollection = {
    type: "FeatureCollection" as const,
    features: kecamatans.map((k) => k.feature),
  };

  const boundaryStyle = (feature?: { properties?: { WADMKC?: string } }) => {
    const name = feature?.properties?.WADMKC ?? "";
    const color = colorMap.get(name) ?? "#2563eb";
    return { color, weight: 2, fillColor: color, fillOpacity: 0.07 };
  };

  const onEachFeature = (
    feature: { properties?: { WADMKC?: string } },
    layer: L.Layer,
  ) => {
    const name = feature.properties?.WADMKC ?? "";
    layer.bindTooltip(name, { sticky: true, direction: "top" });
    layer.on("click", () => {
      const bounds = (layer as L.Polygon).getBounds();
      if (bounds.isValid())
        mapRef.current?.fitBounds(bounds, { padding: [20, 20] });
    });
  };

  const handleAdd = (lat: number, lng: number) => {
    const kecamatan = findKecamatan(
      lng,
      lat,
      kecamatans.map((k) => ({ name: k.name, feature: k.feature })),
    );
    const marker: BuildingMarker = {
      id: uid(),
      number: nextNumber(markers),
      label: "",
      lat,
      lng,
      kecamatan,
      createdAt: Date.now(),
    };
    setMarkers((prev) => [...prev, marker]);
    setSelectedId(marker.id);
  };

  const updateMarker = (
    id: string,
    patch: Partial<Pick<BuildingMarker, "label" | "number">>,
  ) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const deleteMarker = (id: string) => {
    setMarkers((prev) => renumber(prev.filter((m) => m.id !== id)));
    if (selectedId === id) setSelectedId(null);
  };

  const zoomToKecamatan = (file: string) => {
    const target = kecamatans.find((k) => k.file === file);
    if (!target) return;
    const bounds = L.geoJSON(target.feature).getBounds();
    if (bounds.isValid())
      mapRef.current?.fitBounds(bounds, { padding: [20, 20] });
  };

  const zoomToMarker = (lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 18, { duration: 0.6 });
  };

  const exportMarkers = () => {
    const blob = new Blob(
      [JSON.stringify(toFeatureCollection(markers), null, 2)],
      {
        type: "application/geo+json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "penomoran-bangunan-pasaman-barat.geojson";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMarkers = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          (parsed as { type?: string }).type !== "FeatureCollection"
        ) {
          throw new Error("File bukan GeoJSON FeatureCollection");
        }
        const imported = markersFromFeatureCollection(
          parsed as FeatureCollection,
        );
        const proceed = window.confirm(
          `Impor ${imported.length} titik dan ganti data yang ada?`,
        );
        if (!proceed) return;
        setMarkers(renumber(imported));
        setSelectedId(null);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Gagal mengimpor file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative h-dvh w-full">
      <MapContainer
        bounds={pasamanBounds}
        boundsOptions={{ padding: [24, 24] }}
        minZoom={7}
        maxZoom={19}
        zoomControl
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url={OSM_TILE_URL}
          attribution={OSM_ATTRIBUTION}
          zIndex={1}
          opacity={baseLayer === "osm" ? 1 : 0}
          maxNativeZoom={19}
          maxZoom={19}
        />
        <TileLayer
          url={ESRI_SATELLITE_URL}
          attribution={ESRI_ATTRIBUTION}
          zIndex={2}
          opacity={baseLayer === "satellite" ? 1 : 0}
          maxNativeZoom={18}
          maxZoom={19}
        />
        <GeoJSON
          data={featureCollection}
          style={boundaryStyle}
          onEachFeature={onEachFeature}
        />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={numberIcon(m.number, m.id === selectedId)}
            eventHandlers={{ click: () => setSelectedId(m.id) }}
          >
            <Tooltip direction="top" offset={[0, -18]}>
              <span>
                {m.number}
                {m.label ? `. ${m.label}` : ""}
              </span>
            </Tooltip>
          </Marker>
        ))}
        <ClickHandler active={addMode} onAdd={handleAdd} />
        <MapController mapRef={mapRef} />
      </MapContainer>

      {addMode && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[1100] -translate-x-1/2 rounded-full bg-zinc-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
          Mode tambah aktif — klik peta untuk menandai bangunan
        </div>
      )}

      <div className="absolute left-14 top-3 z-[1100] flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-md">
        <button
          type="button"
          onClick={() => setBaseLayer("osm")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            baseLayer === "osm"
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          Peta
        </button>
        <button
          type="button"
          onClick={() => setBaseLayer("satellite")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            baseLayer === "satellite"
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          Satelit
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-1 left-1 z-[1000] rounded bg-black/40 px-2 py-0.5 text-[11px] text-white/90">
        {baseLayer === "osm" ? (
          <>
            &copy;{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto underline"
            >
              OpenStreetMap
            </a>{" "}
            contributors
          </>
        ) : (
          ESRI_ATTRIBUTION
        )}
      </div>

      <MarkerPanel
        markers={markers}
        selectedId={selectedId}
        addMode={addMode}
        kecamatans={kecamatans}
        onSelect={setSelectedId}
        onToggleAdd={() => setAddMode((v) => !v)}
        onUpdateMarker={updateMarker}
        onDelete={deleteMarker}
        onRenumber={() => setMarkers((prev) => renumber(prev))}
        onExport={exportMarkers}
        onImport={importMarkers}
        onZoomToMarker={zoomToMarker}
        onZoomToKecamatan={zoomToKecamatan}
      />
    </div>
  );
}
