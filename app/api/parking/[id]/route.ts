import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { locationToDTO } from "@/lib/dto";
import { estimateOccupancy } from "@/lib/availability-server";
import { currentZoneStatus } from "@/lib/zone-status";
import { freeUntil, isFreeNow, paidUntil } from "@/lib/free-window";
import { haversineMeters } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const loc = await prisma.parkingLocation.findUnique({
    where: { id: params.id },
    include: { rules: true, prices: true },
  });
  if (!loc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const dto = locationToDTO(loc);
  const now = new Date();
  const occ = await estimateOccupancy(loc.id, now);
  const zone = currentZoneStatus(
    { parkingType: dto.parkingType, rules: dto.rules, occupancyPercent: occ.percent },
    now,
  );

  const tips = await prisma.localTip.findMany({ take: 10 });
  const nearbyTips = tips
    .map((t) => {
      const d =
        t.latitude != null && t.longitude != null
          ? haversineMeters(loc.latitude, loc.longitude, t.latitude, t.longitude)
          : 1_000_000;
      return { tip: t, d };
    })
    .filter((x) => x.d < 1500)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => ({
      id: x.tip.id,
      title: x.tip.title,
      body: x.tip.body,
      latitude: x.tip.latitude,
      longitude: x.tip.longitude,
      sourceUrl: x.tip.sourceUrl,
    }));

  const freeNow = isFreeNow(dto.rules, now);
  return NextResponse.json({
    ...dto,
    occupancy: occ,
    zoneStatus: zone,
    isFreeNow: freeNow,
    freeUntil: (freeNow ? freeUntil(dto.rules, now) : null)?.toISOString() ?? null,
    paidUntil: (!freeNow ? paidUntil(dto.rules, now) : null)?.toISOString() ?? null,
    tips: nearbyTips,
  });
}
