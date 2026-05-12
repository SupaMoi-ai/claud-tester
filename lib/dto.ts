import type {
  ParkingLocation,
  ParkingRule,
  ParkingPrice,
} from "@prisma/client";
import type { ParkingLocationDTO, RuleDTO, PriceDTO } from "./types";

export function ruleToDTO(r: ParkingRule): RuleDTO {
  return {
    id: r.id,
    ruleTextOriginal: r.ruleTextOriginal,
    ruleTextSimple: r.ruleTextSimple,
    freeWindow: (r.freeWindow as RuleDTO["freeWindow"]) ?? null,
    enforcementWindow:
      (r.enforcementWindow as RuleDTO["enforcementWindow"]) ?? null,
    maxStayMinutes: r.maxStayMinutes,
    permitRequired: r.permitRequired,
    appliesDays: r.appliesDays,
    sourceUrl: r.sourceUrl,
    lastVerifiedAt: r.lastVerifiedAt?.toISOString() ?? null,
  };
}

export function priceToDTO(p: ParkingPrice): PriceDTO {
  return {
    id: p.id,
    priceType: p.priceType,
    amountNok: p.amountNok,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    appliesDays: p.appliesDays,
    notes: p.notes,
    sourceUrl: p.sourceUrl,
    lastVerifiedAt: p.lastVerifiedAt?.toISOString() ?? null,
  };
}

export function locationToDTO(
  loc: ParkingLocation & { rules: ParkingRule[]; prices: ParkingPrice[] },
): ParkingLocationDTO {
  return {
    id: loc.id,
    slug: loc.slug,
    name: loc.name,
    parkingType: loc.parkingType,
    latitude: loc.latitude,
    longitude: loc.longitude,
    capacity: loc.capacity,
    capacityDisabled: loc.capacityDisabled,
    capacityCharging: loc.capacityCharging,
    covered: loc.covered,
    operator: loc.operator,
    address: loc.address,
    notes: loc.notes,
    sourceUrl: loc.sourceUrl,
    lastVerifiedAt: loc.lastVerifiedAt?.toISOString() ?? null,
    confidenceScore: loc.confidenceScore,
    rules: loc.rules.map(ruleToDTO),
    prices: loc.prices.map(priceToDTO),
  };
}
