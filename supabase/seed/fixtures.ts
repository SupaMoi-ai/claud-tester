import { mockCaptures } from "@/lib/ai/mockCaptureResult";

/**
 * Demo family fixtures per the Hjemmet spec's seed data section.
 * Ids are fixed UUIDs so the seed script is idempotent (upsert-by-id) and
 * cross-references (member_id, chore_id, ...) stay stable across re-runs.
 */

export const FAMILY_ID = "d0000000-0000-4000-8000-000000000001";

export const MEMBER_IDS = {
  thomas: "d0000000-0000-4000-8000-000000000010",
  sisilie: "d0000000-0000-4000-8000-000000000011",
  ellie: "d0000000-0000-4000-8000-000000000012",
  eliyah: "d0000000-0000-4000-8000-000000000013",
} as const;

export const family = {
  id: FAMILY_ID,
  name: "Familie Moi",
};

export const members = [
  {
    id: MEMBER_IDS.thomas,
    family_id: FAMILY_ID,
    display_name: "Thomas",
    role: "parent" as const,
    home: "pappa" as const,
    color: "#B5602F", // terra
  },
  {
    id: MEMBER_IDS.sisilie,
    family_id: FAMILY_ID,
    display_name: "Sisilie",
    role: "parent" as const,
    home: "mamma" as const,
    color: "#2A6353", // mamma
  },
  {
    id: MEMBER_IDS.ellie,
    family_id: FAMILY_ID,
    display_name: "Ellie",
    role: "child" as const,
    home: null,
    color: "#B5602F", // terra tile
  },
  {
    id: MEMBER_IDS.eliyah,
    family_id: FAMILY_ID,
    display_name: "Eliyah",
    role: "child" as const,
    home: null,
    color: "#1C4A3E", // pine/green tile
  },
];

/** Mandag-torsdag pappa, fredag-søndag mamma; anchor 2026-07-06 is a Monday. */
export const custodyPattern = {
  family_id: FAMILY_ID,
  pattern: ["pappa", "pappa", "pappa", "pappa", "mamma", "mamma", "mamma"] as (
    | "mamma"
    | "pappa"
  )[],
  anchor_date: "2026-07-06",
  handover_time: "16:00:00",
};

export const ellieChores = [
  "Re opp sengen",
  "Rydd av frokostbordet",
  "Pakk fotballsekken",
  "Skittentøy i kurven",
  "Mat katten",
];

export const eliyahChores = [
  "Re opp sengen",
  "Pakk leirskole-sekk",
  "Tøm søpla",
  "Sett skoene på plass",
];

/**
 * Sample captures for the demo family, derived from the same fixtures the
 * mocked /fang capture flow uses (lib/ai/mockCaptureResult.ts), so the
 * command center has real data to render without ever calling Claude.
 */
export const sampleCaptures = mockCaptures.map((m) => ({
  source: m.source as "spond" | "vigilo" | "mykid",
  raw_text: m.rawText,
  ai_result: m.result,
}));
