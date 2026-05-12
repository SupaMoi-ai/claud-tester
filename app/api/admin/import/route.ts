import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/db";
import { isInRogaland } from "@/lib/geo";

type IncomingRow = {
  slug: string;
  name: string;
  parking_type: string;
  latitude: string;
  longitude: string;
  capacity?: string;
  covered?: string;
  operator?: string;
  address?: string;
  source_url?: string;
  rule_text_original?: string;
  rule_text_simple?: string;
  price_hourly_nok?: string;
};

const VALID_TYPES = ["STREET", "GARAGE", "LOT", "RESIDENT", "EV", "DISABLED", "LOADING"];

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let rows: IncomingRow[] = [];
  if (contentType.includes("application/json")) {
    rows = (await req.json()) as IncomingRow[];
  } else {
    const text = await req.text();
    rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as IncomingRow[];
  }

  let upserted = 0;
  const errors: { slug: string; reason: string }[] = [];

  for (const row of rows) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (!isFinite(lat) || !isFinite(lng) || !isInRogaland(lat, lng)) {
      errors.push({ slug: row.slug, reason: "outside_rogaland_or_bad_coords" });
      continue;
    }
    const type = row.parking_type?.toUpperCase();
    if (!VALID_TYPES.includes(type)) {
      errors.push({ slug: row.slug, reason: "invalid_parking_type" });
      continue;
    }

    const loc = await prisma.parkingLocation.upsert({
      where: { slug: row.slug },
      create: {
        slug: row.slug,
        name: row.name,
        parkingType: type as (typeof VALID_TYPES)[number] as never,
        latitude: lat,
        longitude: lng,
        capacity: row.capacity ? Number(row.capacity) : null,
        covered: row.covered === "true" || row.covered === "1",
        operator: row.operator ?? null,
        address: row.address ?? null,
        sourceUrl: row.source_url ?? null,
        sourceType: "csv",
        lastVerifiedAt: new Date(),
      },
      update: {
        name: row.name,
        parkingType: type as (typeof VALID_TYPES)[number] as never,
        latitude: lat,
        longitude: lng,
        capacity: row.capacity ? Number(row.capacity) : null,
        covered: row.covered === "true" || row.covered === "1",
        operator: row.operator ?? null,
        address: row.address ?? null,
        sourceUrl: row.source_url ?? null,
        lastVerifiedAt: new Date(),
      },
    });

    if (row.rule_text_original && row.rule_text_simple) {
      await prisma.parkingRule.create({
        data: {
          locationId: loc.id,
          ruleTextOriginal: row.rule_text_original,
          ruleTextSimple: row.rule_text_simple,
          sourceUrl: row.source_url ?? null,
          lastVerifiedAt: new Date(),
        },
      });
    }

    if (row.price_hourly_nok) {
      const amt = Number(row.price_hourly_nok);
      if (isFinite(amt)) {
        await prisma.parkingPrice.create({
          data: {
            locationId: loc.id,
            priceType: "HOURLY",
            amountNok: amt,
            sourceUrl: row.source_url ?? null,
            lastVerifiedAt: new Date(),
          },
        });
      }
    }

    upserted += 1;
  }

  return NextResponse.json({ upserted, errors });
}
