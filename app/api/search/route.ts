import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/nominatim";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await geocode(q);
  return NextResponse.json({ results });
}
