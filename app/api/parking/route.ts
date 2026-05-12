import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { locationToDTO } from "@/lib/dto";
import { haversineMeters, isInRogaland } from "@/lib/geo";
import { scoreItem, sortByScore } from "@/lib/ranking";
import { estimateOccupancy } from "@/lib/availability-server";
import { buildPatternBlob } from "@/lib/availability-server";
import { currentZoneStatus } from "@/lib/zone-status";
import {
  freeUntil,
  isFreeNow,
  paidUntil,
} from "@/lib/free-window";
import type { ParkingListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat") ?? "");
  const lng = Number(url.searchParams.get("lng") ?? "");
  const filtersParam = url.searchParams.get("filters") ?? "";
  const filters = new Set(filtersParam.split(",").filter(Boolean));
  const includePatterns = url.searchParams.get("include") === "patterns";

  const userPoint =
    Number.isFinite(lat) && Number.isFinite(lng) && isInRogaland(lat, lng)
      ? { lat, lng }
      : null;

  const locations = await prisma.parkingLocation.findMany({
    include: { rules: true, prices: true, availability: includePatterns },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const items: ParkingListItem[] = [];
  for (const loc of locations) {
    const dto = locationToDTO(loc);

    if (filters.has("free") && !isFreeNow(dto.rules, now) && !dto.prices.some((p) => p.priceType === "FREE")) continue;
    if (filters.has("ev") && (dto.capacityCharging ?? 0) <= 0) continue;
    if (filters.has("covered") && !dto.covered) continue;
    if (filters.has("disabled") && (dto.capacityDisabled ?? 0) <= 0) continue;

    const walkingMeters = userPoint
      ? Math.round(
          haversineMeters(userPoint.lat, userPoint.lng, loc.latitude, loc.longitude),
        )
      : null;

    const occ = await estimateOccupancy(loc.id, now);
    const zone = currentZoneStatus(
      { parkingType: dto.parkingType, rules: dto.rules, occupancyPercent: occ.percent },
      now,
    );

    const freeNow = isFreeNow(dto.rules, now);
    const fu = freeNow ? freeUntil(dto.rules, now) : null;
    const pu = !freeNow ? paidUntil(dto.rules, now) : null;

    const { score, breakdown } = scoreItem(dto, walkingMeters, occ.percent, now);

    items.push({
      ...dto,
      score,
      scoreBreakdown: breakdown,
      walkingMeters,
      estimatedOccupancyPercent: Math.round(occ.percent),
      occupancyConfidence: Math.round(occ.confidence * 100) / 100,
      zoneStatus: zone,
      isFreeNow: freeNow,
      freeUntil: fu?.toISOString() ?? null,
      paidUntil: pu?.toISOString() ?? null,
      patternBlob: includePatterns
        ? buildPatternBlob(
            "availability" in loc && Array.isArray((loc as { availability: unknown }).availability)
              ? ((loc as { availability: { weekday: number; hour: number; occupancyPercent: number }[] }).availability)
              : [],
          )
        : undefined,
    });
  }

  return NextResponse.json({
    fetchedAt: now.toISOString(),
    items: sortByScore(items),
  });
}
