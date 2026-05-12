import { PrismaClient } from "@prisma/client";
import { ROGALAND_BBOX } from "../lib/rogaland-bounds";

const prisma = new PrismaClient();

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS = "https://overpass-api.de/api/interpreter";

function mapParkingType(tags: Record<string, string>): string {
  const access = tags.access;
  const parking = tags.parking;
  if (tags["parking:type"] === "loading" || tags["loading"] === "yes") return "LOADING";
  if (access === "private" && tags.residential) return "RESIDENT";
  if (parking === "underground" || parking === "multi-storey") return "GARAGE";
  if (tags.capacity_charging || tags["charging_station"]) return "EV";
  if (tags.capacity_disabled || tags["wheelchair"] === "designated") return "DISABLED";
  if (parking === "street_side" || parking === "lane") return "STREET";
  return "LOT";
}

function slugFor(el: OverpassElement): string {
  return `osm-${el.type}-${el.id}`;
}

function intOrNull(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

async function fetchAll(): Promise<OverpassElement[]> {
  const { south, west, north, east } = ROGALAND_BBOX;
  const query = `[out:json][timeout:90];
(
  node["amenity"="parking"](${south},${west},${north},${east});
  way["amenity"="parking"](${south},${west},${north},${east});
  relation["amenity"="parking"](${south},${west},${north},${east});
);
out center tags;`;
  const resp = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });
  if (!resp.ok) {
    throw new Error(`Overpass HTTP ${resp.status}`);
  }
  const json = (await resp.json()) as { elements: OverpassElement[] };
  return json.elements ?? [];
}

async function main() {
  console.log("Fetching parking from Overpass…");
  const elements = await fetchAll();
  console.log(`Got ${elements.length} elements.`);

  let upserted = 0;
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const tags = el.tags ?? {};

    const name = tags.name ?? tags.operator ?? `Parking ${el.type} ${el.id}`;
    const slug = slugFor(el);
    const parkingType = mapParkingType(tags);

    await prisma.parkingLocation.upsert({
      where: { slug },
      create: {
        slug,
        name,
        parkingType: parkingType as never,
        latitude: lat,
        longitude: lng,
        capacity: intOrNull(tags.capacity),
        capacityDisabled: intOrNull(tags["capacity:disabled"]),
        capacityCharging: intOrNull(tags["capacity:charging"]),
        covered: tags.covered === "yes" || tags.parking === "underground",
        operator: tags.operator ?? null,
        address: tags["addr:street"]
          ? `${tags["addr:street"]}${tags["addr:housenumber"] ? " " + tags["addr:housenumber"] : ""}`
          : null,
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        sourceType: "osm",
        sourceId: String(el.id),
        notes:
          tags.fee || tags.maxstay
            ? JSON.stringify({ fee: tags.fee, maxstay: tags.maxstay })
            : null,
        confidenceScore: 0.5,
        lastVerifiedAt: new Date(),
      },
      update: {
        name,
        parkingType: parkingType as never,
        latitude: lat,
        longitude: lng,
        capacity: intOrNull(tags.capacity),
        capacityDisabled: intOrNull(tags["capacity:disabled"]),
        capacityCharging: intOrNull(tags["capacity:charging"]),
        covered: tags.covered === "yes" || tags.parking === "underground",
        operator: tags.operator ?? null,
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        lastVerifiedAt: new Date(),
      },
    });
    upserted += 1;
  }

  console.log(`Upserted ${upserted} parking locations from OSM.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
