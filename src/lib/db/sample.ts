import type { PieceDraft } from "@/lib/types/piece";

export function sampleVersaceSS92(): PieceDraft {
  return {
    brand: "Versace",
    designer: "Gianni Versace",
    category: "shirt",
    garment_type: "silk camp shirt",
    size_label: "52 IT",
    size_modern_equivalent: "L / 40 US",

    era_decade: "1990s",
    era_year_estimate: "1992",
    era_collection: "SS92 Miami",
    attribution_confidence: "high",

    auth_state: "verified",
    auth_checklist: {
      label_evolution: "pass",
      hardware: "pass",
      stitching: "pass",
      country_tag: "pass",
    },
    auth_notes:
      "Genuine Miami-era Versace silk. Black label with Medusa head, Made in Italy tag intact, French seams.",
    auth_reference_pieces: [],

    condition_grade: "excellent",
    condition_notes: "Light wear at cuffs, otherwise pristine.",
    flaws: [],

    fabric_primary: "silk",
    fabric_composition: "100% silk",
    construction_notes: "French seams, mother-of-pearl buttons.",

    source: "Lorenzo",
    source_detail: "Milan pickup, March batch",
    cost_nok: 1800,
    cost_eur: 155,
    acquired_at: new Date().toISOString(),

    valuation_floor_nok: 4500,
    valuation_target_nok: 6500,
    valuation_stretch_nok: 8500,
    valuation_method: "hybrid",
    valuation_explanation: "Oslo premium +8%, condition -6%, SS92 hype +12%",
    comps: [
      {
        source: "Vestiaire",
        price_nok: 7200,
        condition: "excellent",
        date_seen: new Date().toISOString(),
        notes: "Identical pattern, sold within 3 weeks.",
      },
    ],

    status: "intake",
    listed_on: [],

    reference_tags: ["versace", "ss92-miami", "silk", "maximalism"],
    trend_tags: ["power-dressing-2026"],
    photos: [],
  };
}
