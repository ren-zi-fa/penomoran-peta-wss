import type { Feature, MultiPolygon } from "geojson";

export interface KecamatanData {
  file: string;
  name: string;
  feature: Feature<MultiPolygon>;
}

// Filenames under public/data. The double dot in `sasakRanahPasisia.` is
// intentional and matches the actual file `sasakRanahPasisia..json`.
export const KECAMATAN_FILES = [
  "gunungTuleh",
  "kinali",
  "kotoBalingka",
  "lembahMelintang",
  "luhakNanduo",
  "pasaman",
  "ranahBatahan",
  "sasakRanahPasisia.",
  "sungaiAur",
  "sungaiBeremas",
  "talamau",
] as const;

export async function loadKecamatan(file: string): Promise<KecamatanData> {
  const res = await fetch(`/data/${file}.json`);
  if (!res.ok) throw new Error(`Gagal memuat ${file}.json`);
  const feature = (await res.json()) as Feature<MultiPolygon>;
  const name = (feature.properties?.WADMKC as string | undefined) ?? file;
  return { file, name, feature };
}

export async function loadAllKecamatan(): Promise<KecamatanData[]> {
  return Promise.all(KECAMATAN_FILES.map(loadKecamatan));
}
