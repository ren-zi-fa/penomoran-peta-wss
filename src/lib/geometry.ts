import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

function pointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  const [outer, ...holes] = polygon.coordinates;
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  for (const hole of holes) {
    if (pointInRing(lng, lat, hole)) return false;
  }
  return true;
}

export function findKecamatan(
  lng: number,
  lat: number,
  kecamatans: { name: string; feature: Feature<MultiPolygon> }[],
): string {
  for (const k of kecamatans) {
    const geometry = k.feature.geometry;
    if (!geometry) continue;
    for (const polygonCoords of geometry.coordinates) {
      const polygon: Polygon = {
        type: "Polygon",
        coordinates: polygonCoords,
      };
      if (pointInPolygon(lng, lat, polygon)) return k.name;
    }
  }
  return "";
}
