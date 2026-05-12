import { prisma } from "./db";
import {
  estimateOccupancyPure,
  type EventSignal,
  type HistoricalPattern,
  type ReportSignal,
} from "./availability";
import type { OccupancyEstimate } from "./types";

export async function estimateOccupancy(
  locationId: string,
  when: Date,
): Promise<OccupancyEstimate> {
  const location = await prisma.parkingLocation.findUnique({
    where: { id: locationId },
    include: {
      availability: true,
      reports: {
        where: {
          reportType: "OCCUPANCY",
          createdAt: { gte: new Date(when.getTime() - 4 * 3600 * 1000) },
          occupancyPercent: { not: null },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!location) {
    throw new Error(`Unknown parking location ${locationId}`);
  }

  const pattern: HistoricalPattern | null = (() => {
    if (location.availability.length === 0) return null;
    const byWeekdayHour = new Array<number>(7 * 24).fill(0);
    const filled = new Array<number>(7 * 24).fill(0);
    let confSum = 0;
    let confN = 0;
    for (const a of location.availability) {
      byWeekdayHour[a.weekday * 24 + a.hour] = a.occupancyPercent;
      filled[a.weekday * 24 + a.hour] = 1;
      confSum += a.confidenceScore;
      confN += 1;
    }
    for (let i = 0; i < 7 * 24; i++) {
      if (!filled[i]) {
        byWeekdayHour[i] = 50;
      }
    }
    return { byWeekdayHour, confidence: confN ? confSum / confN : 0.3 };
  })();

  const reports: ReportSignal[] = location.reports.map((r) => ({
    occupancyPercent: r.occupancyPercent!,
    createdAt: r.createdAt,
  }));

  const eventsRaw = await prisma.parkingEvent.findMany({
    where: {
      startsAt: { lte: new Date(when.getTime() + 60 * 60_000) },
      endsAt: { gte: new Date(when.getTime() - 30 * 60_000) },
    },
  });

  const nearbyEvents: EventSignal[] = eventsRaw.map((e) => ({
    latitude: e.latitude,
    longitude: e.longitude,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    impactLevel: e.impactLevel,
    isCruise: e.name.startsWith("cruise:"),
  }));

  const trafficPressure = avgTrafficPressure(location.availability, when);

  return estimateOccupancyPure(
    {
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        parkingType: location.parkingType,
      },
      pattern,
      reports,
      nearbyEvents,
      trafficPressure,
    },
    when,
  );
}

function avgTrafficPressure(
  rows: { weekday: number; hour: number; trafficPressure: number | null }[],
  when: Date,
): number | null {
  const wd = when.getDay();
  const hr = when.getHours();
  const match = rows.find((r) => r.weekday === wd && r.hour === hr);
  if (match?.trafficPressure != null) return match.trafficPressure;
  const all = rows.map((r) => r.trafficPressure).filter((x): x is number => x != null);
  if (all.length === 0) return null;
  return all.reduce((a, b) => a + b, 0) / all.length;
}

export function buildPatternBlob(
  rows: { weekday: number; hour: number; occupancyPercent: number }[],
): number[] {
  const blob = new Array<number>(7 * 24).fill(50);
  for (const r of rows) {
    blob[r.weekday * 24 + r.hour] = Math.round(r.occupancyPercent);
  }
  return blob;
}
