import { CaptureResult, CaptureSource } from "./captureResultSchema";

/**
 * Realistic Norwegian capture fixtures matching captureResultSchema. Used by:
 *  - the /fang capture flow (step 5), so the full capture -> review -> confirm
 *    UX is buildable and testable before the edge function calls Claude for real.
 *  - supabase/seed/fixtures.ts, so the seeded demo family has the same data.
 */
export interface MockCapture {
  source: CaptureSource;
  rawText: string;
  result: CaptureResult;
}

export const mockCaptures: MockCapture[] = [
  {
    source: "spond",
    rawText:
      "Fotballtrening Madla IL - Ellie sitt lag trener tirsdag 14. juli kl 17:00-18:15 på Madla stadion. Husk leggskinn og fotballsko.",
    result: {
      summary: "Fotballtrening for Ellie tirsdag på Madla stadion.",
      source_guess: "spond",
      events: [
        {
          title: "Fotballtrening Madla IL",
          starts_at: "2026-07-14T17:00:00+02:00",
          ends_at: "2026-07-14T18:15:00+02:00",
          location: "Madla stadion",
          kid_names: ["Ellie"],
          home_suggestion: "pappa",
          home_reason: "14. juli er en tirsdag, som er en Pappa-dag i bytteplanen.",
        },
      ],
      bag_items: [
        { name: "Leggskinn", for_kid: "Ellie", due_date: "2026-07-14" },
        { name: "Fotballsko", for_kid: "Ellie", due_date: "2026-07-14" },
      ],
      money_items: [],
      chore_suggestions: [
        {
          kid_name: "Ellie",
          title: "Pakk fotballsekken",
          hint: "Leggskinn og fotballsko kvelden før",
        },
      ],
    },
  },
  {
    source: "vigilo",
    rawText:
      "Leirskole Solstrålen - Eliyah sin klasse drar på leirskole 20.-22. august. Avreise fra skolen kl 08:00. Pakkeliste sendes egen post. Husk sovepose og innesko.",
    result: {
      summary: "Leirskole Solstrålen for Eliyah 20.-22. august.",
      source_guess: "vigilo",
      events: [
        {
          title: "Leirskole Solstrålen",
          starts_at: "2026-08-20T08:00:00+02:00",
          ends_at: "2026-08-22T16:00:00+02:00",
          location: "Solstrålen leirskole",
          kid_names: ["Eliyah"],
          home_suggestion: "begge",
          home_reason:
            "Leirskolen strekker seg over både Pappa- og Mamma-dager i bytteplanen, så begge foreldre er involvert.",
        },
      ],
      bag_items: [
        { name: "Sovepose", for_kid: "Eliyah", due_date: "2026-08-20" },
        { name: "Innesko", for_kid: "Eliyah", due_date: "2026-08-20" },
      ],
      money_items: [],
      chore_suggestions: [
        { kid_name: "Eliyah", title: "Pakk leirskole-sekk", hint: "Sovepose og innesko" },
      ],
    },
  },
  {
    source: "mykid",
    rawText:
      "Dugnad SFO - Vi trenger hjelp til høstdugnad lørdag 5. september kl 10-13. Alternativt kan man betale seg fri med kr 150 via Vipps til #12345.",
    result: {
      summary: "Dugnad på SFO 5. september, eller betal kr 150 via Vipps.",
      source_guess: "mykid",
      events: [
        {
          title: "Dugnad SFO",
          starts_at: "2026-09-05T10:00:00+02:00",
          ends_at: "2026-09-05T13:00:00+02:00",
          location: "SFO",
          home_suggestion: "mamma",
          home_reason: "5. september er en lørdag, som er en Mamma-dag i bytteplanen.",
        },
      ],
      bag_items: [],
      money_items: [
        {
          title: "Dugnad SFO (betal fri)",
          amount_nok: 150,
          vipps_number: "#12345",
          due_date: "2026-09-05",
        },
      ],
      chore_suggestions: [],
    },
  },
];

const fallbackCapture: MockCapture = (() => {
  const first = mockCaptures[0];
  if (!first) {
    throw new Error("mockCaptures must not be empty.");
  }
  return first;
})();

/** Picks a mock result matching the chosen source chip, falling back to the first fixture. */
export function getMockCaptureResult(source: CaptureSource): CaptureResult {
  const match = mockCaptures.find((m) => m.source === source);
  return (match ?? fallbackCapture).result;
}
