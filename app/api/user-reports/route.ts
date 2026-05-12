import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  locationId: z.string().optional(),
  reportType: z.enum(["OCCUPANCY", "PRICE_CORRECTION", "RULE_CORRECTION", "OTHER"]),
  occupancyPercent: z.number().min(0).max(100).optional(),
  textBody: z.string().max(1000).optional(),
  contactEmail: z.string().email().optional(),
  clientFingerprint: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.userReport.create({ data: parsed.data });
  return NextResponse.json({ id: row.id, createdAt: row.createdAt });
}
