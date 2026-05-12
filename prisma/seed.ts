import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type EnforcementWindow = { daysOfWeek: number[]; startMinute: number; endMinute: number };
type FreeWindow = EnforcementWindow;

type RuleSeed = {
  ruleTextOriginal: string;
  ruleTextSimple: string;
  freeWindow?: FreeWindow;
  enforcementWindow?: EnforcementWindow;
  maxStayMinutes?: number;
  permitRequired?: boolean;
  appliesDays?: string;
};

type PriceSeed = {
  priceType: "HOURLY" | "DAILY" | "MONTHLY" | "EVENING" | "WEEKEND" | "FREE";
  amountNok: number;
  startsAt?: string;
  endsAt?: string;
  appliesDays?: string;
  notes?: string;
};

type LocationSeed = {
  slug: string;
  name: string;
  parkingType:
    | "STREET"
    | "GARAGE"
    | "LOT"
    | "RESIDENT"
    | "EV"
    | "DISABLED"
    | "LOADING";
  latitude: number;
  longitude: number;
  capacity?: number;
  capacityDisabled?: number;
  capacityCharging?: number;
  covered?: boolean;
  operator?: string;
  address?: string;
  notes?: string;
  sourceUrl?: string;
  confidenceScore?: number;
  rules: RuleSeed[];
  prices: PriceSeed[];
  occupancyByHour?: Partial<Record<number, number>>;
};

const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const SOURCE_KOMMUNE = "https://www.stavanger.kommune.no/gater-veier-og-parkering/";

const LOCATIONS: LocationSeed[] = [
  {
    slug: "jorenholmen-phus",
    name: "Jorenholmen P-hus",
    parkingType: "GARAGE",
    latitude: 58.9696,
    longitude: 5.7331,
    capacity: 270,
    capacityDisabled: 8,
    capacityCharging: 6,
    covered: true,
    operator: "Stavanger Parkeringsselskap",
    address: "Verksgata 3, 4013 Stavanger",
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal:
          "Avgiftsparkering 08:00–22:00. Maks 24 timer sammenhengende.",
        ruleTextSimple: "Paid every day 08:00–22:00. Max 24h in a row.",
        enforcementWindow: {
          daysOfWeek: ALL_DAYS,
          startMinute: 8 * 60,
          endMinute: 22 * 60,
        },
        maxStayMinutes: 24 * 60,
      },
    ],
    prices: [
      { priceType: "HOURLY", amountNok: 28, startsAt: "08:00", endsAt: "22:00" },
      { priceType: "EVENING", amountNok: 10, startsAt: "22:00", endsAt: "08:00" },
      { priceType: "DAILY", amountNok: 180 },
    ],
    occupancyByHour: { 8: 30, 10: 60, 12: 80, 14: 78, 16: 70, 18: 50, 20: 30 },
  },
  {
    slug: "valberget-phus",
    name: "Valberget P-hus",
    parkingType: "GARAGE",
    latitude: 58.9722,
    longitude: 5.7349,
    capacity: 360,
    capacityDisabled: 6,
    covered: true,
    operator: "Stavanger Parkeringsselskap",
    address: "Lars Hertervigs gate 4, 4005 Stavanger",
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal: "Avgiftsparkering 08:00–22:00.",
        ruleTextSimple: "Paid every day 08:00–22:00.",
        enforcementWindow: {
          daysOfWeek: ALL_DAYS,
          startMinute: 8 * 60,
          endMinute: 22 * 60,
        },
      },
    ],
    prices: [
      { priceType: "HOURLY", amountNok: 30 },
      { priceType: "DAILY", amountNok: 220 },
    ],
  },
  {
    slug: "st-olav-phus",
    name: "St. Olav P-hus",
    parkingType: "GARAGE",
    latitude: 58.9737,
    longitude: 5.737,
    capacity: 540,
    capacityDisabled: 10,
    capacityCharging: 4,
    covered: true,
    operator: "Stavanger Parkeringsselskap",
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal: "Avgiftsparkering hele døgnet.",
        ruleTextSimple: "Paid 24/7.",
        enforcementWindow: { daysOfWeek: ALL_DAYS, startMinute: 0, endMinute: 24 * 60 - 1 },
      },
    ],
    prices: [
      { priceType: "HOURLY", amountNok: 32 },
      { priceType: "DAILY", amountNok: 240 },
    ],
  },
  {
    slug: "kannik-street",
    name: "Kannik gatemerket sone",
    parkingType: "STREET",
    latitude: 58.974,
    longitude: 5.728,
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal:
          "Avgiftsparkering man–lør 08:00–18:00. Gratis utenfor disse tidene.",
        ruleTextSimple: "Paid Mon–Sat 08:00–18:00. Free other times.",
        enforcementWindow: {
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startMinute: 8 * 60,
          endMinute: 18 * 60,
        },
        freeWindow: {
          daysOfWeek: ALL_DAYS,
          startMinute: 18 * 60,
          endMinute: 8 * 60,
        },
        maxStayMinutes: 4 * 60,
      },
    ],
    prices: [{ priceType: "HOURLY", amountNok: 26 }],
  },
  {
    slug: "forum-street",
    name: "Forumområdet (gateparkering)",
    parkingType: "STREET",
    latitude: 58.9621,
    longitude: 5.7281,
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal: "Avgift man–fre 09:00–17:00. Gratis kveld og helg.",
        ruleTextSimple: "Paid Mon–Fri 09:00–17:00. Free evenings & weekends.",
        enforcementWindow: {
          daysOfWeek: WEEKDAYS,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        },
        freeWindow: { daysOfWeek: [0, 6], startMinute: 0, endMinute: 24 * 60 - 1 },
        maxStayMinutes: 3 * 60,
      },
    ],
    prices: [{ priceType: "HOURLY", amountNok: 22 }],
  },
  {
    slug: "bekhuskaien-street",
    name: "Bekhuskaien",
    parkingType: "STREET",
    latitude: 58.9745,
    longitude: 5.7398,
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal:
          "Avgift 08:00–18:00 alle dager. Gratis etter 18:00.",
        ruleTextSimple: "Paid 08:00–18:00 every day. Free after 18:00.",
        enforcementWindow: { daysOfWeek: ALL_DAYS, startMinute: 8 * 60, endMinute: 18 * 60 },
        freeWindow: { daysOfWeek: ALL_DAYS, startMinute: 18 * 60, endMinute: 8 * 60 },
      },
    ],
    prices: [{ priceType: "HOURLY", amountNok: 24 }],
  },
  {
    slug: "domkirkeplassen-short",
    name: "Domkirkeplassen korttidssone",
    parkingType: "STREET",
    latitude: 58.9708,
    longitude: 5.7331,
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal: "Maks 30 minutter, avgift hele døgnet.",
        ruleTextSimple: "30-minute max. Paid 24/7.",
        enforcementWindow: { daysOfWeek: ALL_DAYS, startMinute: 0, endMinute: 24 * 60 - 1 },
        maxStayMinutes: 30,
      },
    ],
    prices: [{ priceType: "HOURLY", amountNok: 40, notes: "Short-stay tariff" }],
  },
  {
    slug: "tjensvoll-park-and-ride",
    name: "Tjensvoll innfartsparkering",
    parkingType: "LOT",
    latitude: 58.9533,
    longitude: 5.7095,
    capacity: 110,
    sourceUrl: "https://www.kolumbus.no/reise/innfartsparkering",
    rules: [
      {
        ruleTextOriginal: "Gratis innfartsparkering for kollektivreisende.",
        ruleTextSimple: "Free park-and-ride for transit users. Bus 3 to centre.",
        freeWindow: { daysOfWeek: ALL_DAYS, startMinute: 0, endMinute: 24 * 60 - 1 },
      },
    ],
    prices: [{ priceType: "FREE", amountNok: 0 }],
  },
  {
    slug: "hillevag-ev-lot",
    name: "Hillevåg ladeplass",
    parkingType: "EV",
    latitude: 58.9255,
    longitude: 5.7283,
    capacity: 24,
    capacityCharging: 18,
    operator: "Recharge",
    sourceUrl: "https://www.recharge.com/no",
    rules: [
      {
        ruleTextOriginal: "Kun for elbiler under lading. Maks 90 min.",
        ruleTextSimple: "EV charging only. Max 90 min while charging.",
        maxStayMinutes: 90,
      },
    ],
    prices: [{ priceType: "HOURLY", amountNok: 0, notes: "Charging fees apply" }],
  },
  {
    slug: "storhaug-resident-st-svithunsgate",
    name: "St. Svithuns gate (beboersone S1)",
    parkingType: "RESIDENT",
    latitude: 58.974,
    longitude: 5.7445,
    sourceUrl: SOURCE_KOMMUNE,
    rules: [
      {
        ruleTextOriginal:
          "Beboerparkering sone S1 hele døgnet. Krever gyldig beboerkort.",
        ruleTextSimple: "Resident zone S1 — permit required 24/7.",
        permitRequired: true,
        enforcementWindow: { daysOfWeek: ALL_DAYS, startMinute: 0, endMinute: 24 * 60 - 1 },
      },
    ],
    prices: [{ priceType: "MONTHLY", amountNok: 400, notes: "Resident permit" }],
  },
  {
    slug: "sus-disabled",
    name: "SUS — HC-plasser ved hovedinngang",
    parkingType: "DISABLED",
    latitude: 58.9266,
    longitude: 5.7197,
    capacityDisabled: 12,
    sourceUrl: "https://helse-stavanger.no/parkering",
    rules: [
      {
        ruleTextOriginal: "Reservert for HC-kort. Gyldig HC-bevis må vises.",
        ruleTextSimple: "Disabled badge holders only. Display badge.",
      },
    ],
    prices: [{ priceType: "FREE", amountNok: 0 }],
  },
  {
    slug: "stavanger-stadion-lot",
    name: "Viking Stadion P-plass",
    parkingType: "LOT",
    latitude: 58.9415,
    longitude: 5.7233,
    capacity: 320,
    sourceUrl: "https://vikingfk.no",
    rules: [
      {
        ruleTextOriginal:
          "Gratis utenom kampdager. Stengt 2 timer før avspark på kampdager.",
        ruleTextSimple:
          "Free except on match days. Closed 2h before kickoff on match days.",
        freeWindow: { daysOfWeek: ALL_DAYS, startMinute: 0, endMinute: 24 * 60 - 1 },
      },
    ],
    prices: [{ priceType: "FREE", amountNok: 0 }],
  },
];

const TIPS = [
  {
    title: "Free after 18:00 on Bekhuskaien",
    body: "Most paid street zones in central Stavanger become free in the evening — Bekhuskaien is one of the easiest to find a spot.",
    latitude: 58.9745,
    longitude: 5.7398,
    sourceUrl: SOURCE_KOMMUNE,
  },
  {
    title: "Tjensvoll P&R + bus 3",
    body: "Park free at Tjensvoll and take bus 3 to the city centre in ~10 minutes. Easier than circling for street parking on match days.",
    latitude: 58.9533,
    longitude: 5.7095,
    sourceUrl: "https://www.kolumbus.no/reise/innfartsparkering",
  },
  {
    title: "Sundays in marked street zones",
    body: "Many short-stay street zones in Stavanger are free on Sundays — but always read the sign: short-stay (korttid) caps still apply.",
    latitude: 58.97,
    longitude: 5.733,
    sourceUrl: SOURCE_KOMMUNE,
  },
];

const CRUISE_CALLS = [
  { date: "2026-05-17", ship: "AIDAsol", expectedPassengers: 2200 },
  { date: "2026-06-04", ship: "MSC Preziosa", expectedPassengers: 3900 },
  { date: "2026-07-12", ship: "Queen Anne", expectedPassengers: 2900 },
];

function hourlyBaseline(parkingType: string): Record<number, number> {
  const out: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    let v = 30;
    if (parkingType === "GARAGE") v = 20 + Math.max(0, 60 * Math.sin(((h - 6) * Math.PI) / 14));
    else if (parkingType === "STREET") v = 25 + Math.max(0, 65 * Math.sin(((h - 5) * Math.PI) / 14));
    else if (parkingType === "RESIDENT") v = 80 + 15 * Math.cos((h * Math.PI) / 12);
    else if (parkingType === "EV") v = 30 + Math.max(0, 50 * Math.sin(((h - 7) * Math.PI) / 12));
    else if (parkingType === "LOT") v = 20 + Math.max(0, 55 * Math.sin(((h - 7) * Math.PI) / 14));
    out[h] = Math.max(0, Math.min(100, Math.round(v)));
  }
  return out;
}

async function main() {
  for (const loc of LOCATIONS) {
    const created = await prisma.parkingLocation.upsert({
      where: { slug: loc.slug },
      create: {
        slug: loc.slug,
        name: loc.name,
        parkingType: loc.parkingType,
        latitude: loc.latitude,
        longitude: loc.longitude,
        capacity: loc.capacity ?? null,
        capacityDisabled: loc.capacityDisabled ?? null,
        capacityCharging: loc.capacityCharging ?? null,
        covered: loc.covered ?? false,
        operator: loc.operator ?? null,
        address: loc.address ?? null,
        sourceUrl: loc.sourceUrl ?? null,
        sourceType: "seed",
        confidenceScore: loc.confidenceScore ?? 0.8,
        lastVerifiedAt: new Date(),
      },
      update: {
        name: loc.name,
        parkingType: loc.parkingType,
        latitude: loc.latitude,
        longitude: loc.longitude,
        capacity: loc.capacity ?? null,
        capacityDisabled: loc.capacityDisabled ?? null,
        capacityCharging: loc.capacityCharging ?? null,
        covered: loc.covered ?? false,
        operator: loc.operator ?? null,
        address: loc.address ?? null,
        sourceUrl: loc.sourceUrl ?? null,
        confidenceScore: loc.confidenceScore ?? 0.8,
        lastVerifiedAt: new Date(),
      },
    });

    await prisma.parkingRule.deleteMany({ where: { locationId: created.id } });
    for (const r of loc.rules) {
      await prisma.parkingRule.create({
        data: {
          locationId: created.id,
          ruleTextOriginal: r.ruleTextOriginal,
          ruleTextSimple: r.ruleTextSimple,
          freeWindow: (r.freeWindow as unknown as object) ?? undefined,
          enforcementWindow: (r.enforcementWindow as unknown as object) ?? undefined,
          maxStayMinutes: r.maxStayMinutes ?? null,
          permitRequired: r.permitRequired ?? false,
          appliesDays: r.appliesDays ?? null,
          sourceUrl: loc.sourceUrl ?? null,
          lastVerifiedAt: new Date(),
        },
      });
    }

    await prisma.parkingPrice.deleteMany({ where: { locationId: created.id } });
    for (const p of loc.prices) {
      await prisma.parkingPrice.create({
        data: {
          locationId: created.id,
          priceType: p.priceType,
          amountNok: p.amountNok,
          startsAt: p.startsAt ?? null,
          endsAt: p.endsAt ?? null,
          appliesDays: p.appliesDays ?? null,
          notes: p.notes ?? null,
          sourceUrl: loc.sourceUrl ?? null,
          lastVerifiedAt: new Date(),
        },
      });
    }

    await prisma.availabilityEstimate.deleteMany({ where: { locationId: created.id } });
    const baseline = hourlyBaseline(loc.parkingType);
    const overrides = loc.occupancyByHour ?? {};
    for (const wd of ALL_DAYS) {
      for (let h = 0; h < 24; h++) {
        const baseValue = overrides[h] ?? baseline[h]!;
        const weekendBias = wd === 0 || wd === 6 ? 0.7 : 1.0;
        const occ = Math.max(0, Math.min(100, Math.round(baseValue * weekendBias)));
        await prisma.availabilityEstimate.create({
          data: {
            locationId: created.id,
            weekday: wd,
            hour: h,
            occupancyPercent: occ,
            confidenceScore: 0.4,
            sampleSize: 0,
          },
        });
      }
    }
  }

  for (const t of TIPS) {
    await prisma.localTip.create({ data: t });
  }

  for (const c of CRUISE_CALLS) {
    const starts = new Date(`${c.date}T07:00:00Z`);
    const ends = new Date(`${c.date}T17:00:00Z`);
    await prisma.parkingEvent.create({
      data: {
        name: `cruise:${c.ship}`,
        latitude: 58.971,
        longitude: 5.731,
        startsAt: starts,
        endsAt: ends,
        impactLevel: c.expectedPassengers > 3000 ? "HIGH" : "MEDIUM",
        expectedPeople: c.expectedPassengers,
        notes: "Cruise call at Vågen/Strandkaien",
        sourceUrl: "https://www.portofstavanger.com/cruise",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
