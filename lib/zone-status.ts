import type { ParkingLocationDTO, RuleDTO, ZoneStatus } from "./types";
import { freeUntil, isFreeNow } from "./free-window";

export type ZoneInputs = {
  parkingType: ParkingLocationDTO["parkingType"];
  rules: RuleDTO[];
  occupancyPercent: number;
};

export function currentZoneStatus(inputs: ZoneInputs, now: Date): ZoneStatus {
  const { parkingType, rules, occupancyPercent } = inputs;

  if (parkingType === "RESIDENT") return "restricted";
  if (parkingType === "DISABLED") return "restricted";
  if (parkingType === "LOADING") return "restricted";

  if (rules.some((r) => r.permitRequired)) return "restricted";
  if (occupancyPercent >= 98) return "restricted";

  if (isFreeNow(rules, now)) {
    const ends = freeUntil(rules, now);
    if (ends) {
      const minutesLeft = (ends.getTime() - now.getTime()) / 60_000;
      if (minutesLeft < 30) return "limited";
    }
    return "free";
  }

  return "limited";
}

export const ZONE_COLORS: Record<ZoneStatus, string> = {
  free: "#3A8A4A",
  limited: "#C68A1F",
  restricted: "#B0463C",
};

export const ZONE_LABEL: Record<ZoneStatus, string> = {
  free: "Free now",
  limited: "Paid / time limit",
  restricted: "Don't park",
};
