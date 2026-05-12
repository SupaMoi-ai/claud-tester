import type {
  OccupancyEstimate,
  OccupancyBreakdown,
  ParkingLocationDTO,
} from "./types";
import { clamp, haversineMeters } from "./geo";

export type HistoricalPattern = {
  byWeekdayHour: number[];
  confidence: number;
};

export type ReportSignal = {
  occupancyPercent: number;
  createdAt: Date;
};

export type EventSignal = {
  latitude: number;
  longitude: number;
  startsAt: Date;
  endsAt: Date;
  impactLevel: "LOW" | "MEDIUM" | "HIGH";
  isCruise?: boolean;
};

export type AvailabilityInputs = {
  location: Pick<ParkingLocationDTO, "id" | "latitude" | "longitude" | "parkingType">;
  pattern: HistoricalPattern | null;
  reports: ReportSignal[];
  nearbyEvents: EventSignal[];
  trafficPressure: number | null;
  operatorLive?: number | null;
  weatherUplift?: number;
};

const BASELINE_BY_TYPE: Record<string, number[]> = {
  GARAGE: hourBaseline([10, 20, 35, 55, 70, 80, 85, 80, 70, 60, 45, 30]),
  LOT: hourBaseline([5, 15, 30, 50, 65, 75, 80, 75, 65, 50, 35, 20]),
  STREET: hourBaseline([20, 30, 50, 70, 80, 85, 85, 80, 75, 65, 50, 35]),
  RESIDENT: hourBaseline([90, 95, 95, 90, 70, 50, 40, 35, 40, 50, 70, 85]),
  EV: hourBaseline([20, 40, 60, 75, 80, 80, 75, 65, 55, 45, 35, 25]),
  DISABLED: hourBaseline([40, 50, 60, 65, 65, 60, 55, 50, 50, 50, 45, 40]),
  LOADING: hourBaseline([10, 50, 80, 70, 60, 50, 40, 30, 20, 15, 10, 10]),
};

function hourBaseline(seed: number[]): number[] {
  const out: number[] = [];
  for (let h = 0; h < 24; h++) {
    const idx = Math.floor((h / 24) * seed.length);
    out.push(seed[idx]!);
  }
  return out;
}

export function baselineFor(parkingType: string, weekday: number, hour: number): number {
  const base = BASELINE_BY_TYPE[parkingType] ?? BASELINE_BY_TYPE.STREET;
  const isWeekend = weekday === 0 || weekday === 6;
  const v = base![hour] ?? 50;
  return clamp(v * (isWeekend ? 0.7 : 1), 0, 100);
}

function impactToUplift(level: "LOW" | "MEDIUM" | "HIGH"): number {
  if (level === "HIGH") return 30;
  if (level === "MEDIUM") return 15;
  return 5;
}

export function estimateOccupancyPure(
  inputs: AvailabilityInputs,
  when: Date,
): OccupancyEstimate {
  const breakdown: OccupancyBreakdown = {};

  if (inputs.operatorLive != null) {
    return {
      percent: clamp(inputs.operatorLive, 0, 100),
      confidence: 0.95,
      source: "operatorLive",
      breakdown: { operatorLive: inputs.operatorLive },
    };
  }

  const weekday = when.getDay();
  const hour = when.getHours();

  let historicalPercent: number;
  let historicalWeight: number;
  if (inputs.pattern && inputs.pattern.byWeekdayHour.length === 7 * 24) {
    historicalPercent = inputs.pattern.byWeekdayHour[weekday * 24 + hour]!;
    historicalWeight = clamp(inputs.pattern.confidence, 0, 1);
  } else {
    historicalPercent = baselineFor(inputs.location.parkingType, weekday, hour);
    historicalWeight = 0.3;
  }
  breakdown.historical = { percent: historicalPercent, weight: historicalWeight };

  const fourHoursAgo = when.getTime() - 4 * 3600 * 1000;
  const fresh = inputs.reports.filter((r) => r.createdAt.getTime() >= fourHoursAgo);
  let reportPercent: number | null = null;
  let reportWeight = 0;
  if (fresh.length > 0) {
    let sumW = 0;
    let sumWP = 0;
    for (const r of fresh) {
      const dtMin = (when.getTime() - r.createdAt.getTime()) / 60_000;
      const w = Math.exp(-dtMin / 30);
      sumW += w;
      sumWP += w * r.occupancyPercent;
    }
    reportPercent = sumWP / sumW;
    reportWeight = 1 - Math.exp(-sumW / 3);
    breakdown.reports = {
      percent: reportPercent,
      weight: reportWeight,
      sampleSize: fresh.length,
    };
  }

  let blendedPercent: number;
  let source: OccupancyEstimate["source"];
  if (reportPercent != null) {
    const totalW = historicalWeight + reportWeight;
    blendedPercent =
      (historicalPercent * historicalWeight + reportPercent * reportWeight) / totalW;
    source = "blended";
  } else {
    blendedPercent = historicalPercent;
    source = inputs.pattern ? "historical" : "heuristic";
  }
  const baseConfidence = clamp(historicalWeight + reportWeight, 0, 1);

  let eventUplift = 0;
  let cruiseUplift = 0;
  for (const e of inputs.nearbyEvents) {
    const buffered = {
      start: e.startsAt.getTime() - 60 * 60_000,
      end: e.endsAt.getTime() + 30 * 60_000,
    };
    if (when.getTime() < buffered.start || when.getTime() > buffered.end) continue;
    const d = haversineMeters(
      inputs.location.latitude,
      inputs.location.longitude,
      e.latitude,
      e.longitude,
    );
    if (e.isCruise) {
      if (d > 600) continue;
      cruiseUplift += impactToUplift(e.impactLevel);
    } else {
      if (d > 800) continue;
      eventUplift += impactToUplift(e.impactLevel);
    }
  }
  eventUplift = Math.min(eventUplift, 40);
  cruiseUplift = Math.min(cruiseUplift, 30);
  if (eventUplift) breakdown.eventUplift = eventUplift;

  const trafficUplift =
    inputs.trafficPressure != null ? clamp(inputs.trafficPressure, 0, 1) * 10 : 0;
  if (trafficUplift) breakdown.trafficUplift = trafficUplift;

  const weatherUplift = inputs.weatherUplift ?? 0;
  if (weatherUplift) breakdown.weatherUplift = weatherUplift;

  const percent = clamp(
    blendedPercent + eventUplift + cruiseUplift + trafficUplift + weatherUplift,
    0,
    100,
  );

  return {
    percent,
    confidence: baseConfidence,
    source,
    breakdown,
  };
}
