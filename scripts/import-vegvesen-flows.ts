import { PrismaClient } from "@prisma/client";
import { fetchVegvesenPointsNear, pressureFromHourlyVolumes } from "../lib/traffic";

const prisma = new PrismaClient();

const VEGVESEN_GRAPHQL = "https://www.vegvesen.no/trafikkdata/api/";

async function fetchHourlyVolumes(pointId: string): Promise<number[]> {
  const from = new Date(Date.now() - 8 * 24 * 3600 * 1000);
  const to = new Date();
  const query = `
    query Volumes($id: String!, $from: DateTime!, $to: DateTime!) {
      trafficData(trafficRegistrationPointId: $id) {
        volume {
          byHour(from: $from, to: $to) {
            edges { node { from to total { volumeNumbers { volume } } } }
          }
        }
      }
    }
  `;
  const resp = await fetch(VEGVESEN_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { id: pointId, from: from.toISOString(), to: to.toISOString() },
    }),
  });
  if (!resp.ok) return [];
  const json = (await resp.json()) as {
    data?: {
      trafficData?: {
        volume?: {
          byHour?: {
            edges?: Array<{ node: { total?: { volumeNumbers?: { volume?: number } } } }>;
          };
        };
      };
    };
  };
  return (json.data?.trafficData?.volume?.byHour?.edges ?? [])
    .map((e) => e.node.total?.volumeNumbers?.volume ?? 0);
}

async function main() {
  const locations = await prisma.parkingLocation.findMany();
  console.log(`Updating traffic pressure for ${locations.length} locations…`);
  for (const loc of locations) {
    const points = await fetchVegvesenPointsNear(loc.latitude, loc.longitude, 300);
    if (points.length === 0) continue;
    let bestPressure: number | null = null;
    for (const p of points) {
      try {
        const volumes = await fetchHourlyVolumes(p.id);
        if (volumes.length) {
          const pressure = pressureFromHourlyVolumes(volumes);
          if (bestPressure == null || pressure > bestPressure) bestPressure = pressure;
        }
      } catch {
        // skip individual point failures
      }
    }
    if (bestPressure == null) continue;
    await prisma.availabilityEstimate.updateMany({
      where: { locationId: loc.id },
      data: { trafficPressure: bestPressure },
    });
    console.log(` ${loc.slug} → ${bestPressure.toFixed(2)} (${points.length} points)`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
