import { NextRequest, NextResponse } from "next/server";
import { fetchVegvesenPointsNear } from "@/lib/traffic";
import { isInRogaland } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat") ?? "");
  const lng = Number(url.searchParams.get("lng") ?? "");
  const radius = Number(url.searchParams.get("radius") ?? "300");
  if (!isFinite(lat) || !isFinite(lng) || !isInRogaland(lat, lng)) {
    return NextResponse.json({ error: "bad_or_out_of_bounds" }, { status: 400 });
  }
  const points = await fetchVegvesenPointsNear(lat, lng, radius);
  return NextResponse.json({ points });
}
