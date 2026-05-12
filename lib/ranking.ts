import type { ParkingListItem, ParkingLocationDTO, PriceDTO, RuleDTO } from "./types";
import { isFreeNow, nextFreeWindowStart } from "./free-window";
import { clamp } from "./geo";

export type ScoreBreakdown = {
  price: number;
  walk: number;
  availability: number;
  ruleSimplicity: number;
  freeWindow: number;
  confidence: number;
};

export function priceScore(prices: PriceDTO[], rules: RuleDTO[], when: Date): number {
  if (isFreeNow(rules, when)) return 1;
  if (prices.some((p) => p.priceType === "FREE")) return 1;
  const hourly = prices.find((p) => p.priceType === "HOURLY");
  if (!hourly) return 0.5;
  return 1 - clamp(hourly.amountNok / 50, 0, 1);
}

export function walkingDistanceScore(meters: number | null): number {
  if (meters == null) return 0.5;
  return 1 - clamp(meters / 1000, 0, 1);
}

export function availabilityScore(occupancyPercent: number): number {
  return 1 - clamp(occupancyPercent / 100, 0, 1);
}

export function ruleSimplicityScore(rules: RuleDTO[]): number {
  if (rules.length === 0) return 0.8;
  let penalty = 0;
  for (const r of rules) {
    if (r.maxStayMinutes != null) penalty += 0.15;
    if (r.permitRequired) penalty += 0.4;
    if (r.enforcementWindow) {
      const start = r.enforcementWindow.startMinute;
      const end = r.enforcementWindow.endMinute;
      const span = end > start ? end - start : 24 * 60 - (start - end);
      if (span < 6 * 60) penalty += 0.1;
    }
  }
  return clamp(1 - penalty, 0, 1);
}

export function freeWindowScore(rules: RuleDTO[], when: Date): number {
  if (isFreeNow(rules, when)) return 1;
  const next = nextFreeWindowStart(rules, when);
  if (!next) return 0;
  const min = (next.getTime() - when.getTime()) / 60_000;
  if (min < 60) return 0.5;
  return 0;
}

export function confidenceScore(item: { confidenceScore: number }): number {
  return clamp(item.confidenceScore, 0, 1);
}

const WEIGHTS = {
  price: 0.25,
  walk: 0.25,
  availability: 0.25,
  ruleSimplicity: 0.1,
  freeWindow: 0.1,
  confidence: 0.05,
} as const;

export function scoreItem(
  loc: ParkingLocationDTO,
  walkingMeters: number | null,
  occupancyPercent: number,
  when: Date,
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    price: priceScore(loc.prices, loc.rules, when),
    walk: walkingDistanceScore(walkingMeters),
    availability: availabilityScore(occupancyPercent),
    ruleSimplicity: ruleSimplicityScore(loc.rules),
    freeWindow: freeWindowScore(loc.rules, when),
    confidence: confidenceScore(loc),
  };
  const score =
    breakdown.price * WEIGHTS.price +
    breakdown.walk * WEIGHTS.walk +
    breakdown.availability * WEIGHTS.availability +
    breakdown.ruleSimplicity * WEIGHTS.ruleSimplicity +
    breakdown.freeWindow * WEIGHTS.freeWindow +
    breakdown.confidence * WEIGHTS.confidence;
  return { score, breakdown };
}

export function sortByScore(items: ParkingListItem[]): ParkingListItem[] {
  return [...items].sort((a, b) => b.score - a.score);
}
