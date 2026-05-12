import { ROGALAND_VIEWBOX } from "./rogaland-bounds";
import { isInRogaland } from "./geo";

export type GeocodeResult = {
  displayName: string;
  latitude: number;
  longitude: number;
  type: string | null;
};

export async function geocode(q: string): Promise<GeocodeResult[]> {
  if (!q.trim()) return [];
  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "0",
    limit: "8",
    viewbox: ROGALAND_VIEWBOX,
    bounded: "1",
    countrycodes: "no",
  });
  const ua = process.env.NOMINATIM_USER_AGENT ?? "stavanger-parking-helper/0.1";
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": ua,
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });
  if (!resp.ok) return [];
  const rows = (await resp.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
  }>;
  return rows
    .map((r) => ({
      displayName: r.display_name,
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      type: r.type ?? null,
    }))
    .filter((g) => isInRogaland(g.latitude, g.longitude));
}
