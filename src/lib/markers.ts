import type { FeatureCollection, Point } from "geojson";

export interface BuildingMarker {
  id: string;
  number: number;
  label: string;
  lat: number;
  lng: number;
  kecamatan: string;
  createdAt: number;
}

const STORAGE_KEY = "peta-marker-wss:markers:v1";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isMarker(value: unknown): value is BuildingMarker {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.number === "number" &&
    typeof o.label === "string" &&
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    typeof o.kecamatan === "string" &&
    typeof o.createdAt === "number"
  );
}

export function loadMarkers(): BuildingMarker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMarker);
  } catch {
    return [];
  }
}

export function saveMarkers(markers: BuildingMarker[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
}

export function nextNumber(markers: BuildingMarker[]): number {
  return markers.reduce((max, m) => Math.max(max, m.number), 0) + 1;
}

export function renumber(markers: BuildingMarker[]): BuildingMarker[] {
  return [...markers]
    .sort((a, b) => a.number - b.number || a.createdAt - b.createdAt)
    .map((m, i) => ({ ...m, number: i + 1 }));
}

export function toFeatureCollection(
  markers: BuildingMarker[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      properties: {
        id: m.id,
        number: m.number,
        label: m.label,
        kecamatan: m.kecamatan,
      },
    })),
  };
}

export function markersFromFeatureCollection(
  fc: FeatureCollection,
): BuildingMarker[] {
  const out: BuildingMarker[] = [];
  for (const feature of fc.features) {
    if (!feature || feature.type !== "Feature" || !feature.geometry) continue;
    if (feature.geometry.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    out.push({
      id: typeof props.id === "string" ? props.id : uid(),
      number: typeof props.number === "number" ? props.number : out.length + 1,
      label: typeof props.label === "string" ? props.label : "",
      lat,
      lng,
      kecamatan: typeof props.kecamatan === "string" ? props.kecamatan : "",
      createdAt: Date.now(),
    });
  }
  return out;
}
