import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CALLS = [
  { date: "2026-05-17", ship: "AIDAsol", passengers: 2200 },
  { date: "2026-05-31", ship: "MSC Euribia", passengers: 4000 },
  { date: "2026-06-04", ship: "MSC Preziosa", passengers: 3900 },
  { date: "2026-06-19", ship: "Norwegian Prima", passengers: 3100 },
  { date: "2026-07-12", ship: "Queen Anne", passengers: 2900 },
  { date: "2026-08-02", ship: "Iona", passengers: 5200 },
];

async function main() {
  for (const c of CALLS) {
    const starts = new Date(`${c.date}T07:00:00Z`);
    const ends = new Date(`${c.date}T17:00:00Z`);
    await prisma.parkingEvent.upsert({
      where: { id: `cruise-${c.date}-${c.ship}` },
      create: {
        id: `cruise-${c.date}-${c.ship}`,
        name: `cruise:${c.ship}`,
        latitude: 58.971,
        longitude: 5.731,
        startsAt: starts,
        endsAt: ends,
        impactLevel: c.passengers > 3500 ? "HIGH" : c.passengers > 2000 ? "MEDIUM" : "LOW",
        expectedPeople: c.passengers,
        sourceUrl: "https://www.portofstavanger.com/cruise",
      },
      update: {
        impactLevel: c.passengers > 3500 ? "HIGH" : c.passengers > 2000 ? "MEDIUM" : "LOW",
        expectedPeople: c.passengers,
      },
    });
  }
  console.log(`Seeded ${CALLS.length} cruise calls.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
