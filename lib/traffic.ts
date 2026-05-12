const VEGVESEN_GRAPHQL = "https://www.vegvesen.no/trafikkdata/api/";

export type TrafficSnapshot = {
  hourlyVolumes: number[];
  fetchedAt: string;
  pointId: string;
};

export async function fetchVegvesenPointsNear(
  lat: number,
  lng: number,
  radiusMeters = 300,
): Promise<{ id: string; latitude: number; longitude: number; name: string }[]> {
  const query = `
    query Points($lat: Float!, $lng: Float!, $radius: Int!) {
      trafficRegistrationPoints(
        searchQuery: {
          roadCategoryIds: [E, R, F, K, P]
          isOperational: true
          location: { nearestPoint: { distanceMeters: $radius, coordinates: { latitude: $lat, longitude: $lng } } }
        }
      ) {
        id
        name
        location { coordinates { latLon { lat lon } } }
      }
    }
  `;
  const resp = await fetch(VEGVESEN_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { lat, lng, radius: radiusMeters } }),
  });
  if (!resp.ok) return [];
  const json = (await resp.json()) as {
    data?: { trafficRegistrationPoints?: Array<{
      id: string;
      name: string;
      location?: { coordinates?: { latLon?: { lat: number; lon: number } } };
    }> };
  };
  const rows = json.data?.trafficRegistrationPoints ?? [];
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.location?.coordinates?.latLon?.lat ?? 0,
      longitude: r.location?.coordinates?.latLon?.lon ?? 0,
    }))
    .filter((r) => r.latitude && r.longitude);
}

export function pressureFromHourlyVolumes(volumes: number[]): number {
  if (volumes.length === 0) return 0;
  const max = Math.max(...volumes, 1);
  return Math.min(volumes.reduce((a, b) => a + b, 0) / (max * volumes.length), 1);
}
