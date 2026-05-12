import { ROGALAND_BBOX } from "./rogaland-bounds";

const R = 6371000;

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

export function isInRogaland(lat: number, lng: number): boolean {
  return (
    lat >= ROGALAND_BBOX.south &&
    lat <= ROGALAND_BBOX.north &&
    lng >= ROGALAND_BBOX.west &&
    lng <= ROGALAND_BBOX.east
  );
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
