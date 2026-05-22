import type {
  Actionability,
  IntentType,
  Mood,
} from "@/lib/supabase/types";
import type { EnrichedPin, PinForEnrichment, VisionProvider } from "./interface";

// Maps a Pinterest description / board name to a plausible enrichment.
// Deterministic so the demo behaves the same on every run.

interface Pattern {
  match: RegExp;
  intent: IntentType;
  mood: Mood;
  actionability: Actionability;
  materials: string[];
  techniques: string[];
  colors: string[];
  era: string | null;
}

const PATTERNS: Pattern[] = [
  {
    match: /linen|cotton|wool|denim|silk|fabric/i,
    intent: "fabric_or_material",
    mood: "warm_earthy",
    actionability: "needs_pattern_or_instructions",
    materials: ["linen"],
    techniques: [],
    colors: ["natural", "oatmeal", "cream"],
    era: null,
  },
  {
    match: /sewing|seam|buttonhole|pattern|pleat|pocket/i,
    intent: "garment_construction",
    mood: "utilitarian",
    actionability: "needs_pattern_or_instructions",
    materials: ["fabric"],
    techniques: ["sewing", "pressing"],
    colors: ["natural", "white"],
    era: null,
  },
  {
    match: /blazer|trench|coat|sweater|shirt|trouser|outfit/i,
    intent: "outfit_inspiration",
    mood: "warm_earthy",
    actionability: "reference_only",
    materials: ["linen", "wool"],
    techniques: [],
    colors: ["beige", "cream", "camel"],
    era: "contemporary minimal",
  },
  {
    match: /lamp|shelf|curtain|floor|chair|table|rug|reading/i,
    intent: "interior_styling",
    mood: "cozy_textured",
    actionability: "reference_only",
    materials: ["brass", "wood", "linen"],
    techniques: [],
    colors: ["warm white", "brass", "wood"],
    era: null,
  },
  {
    match: /shibori|macrame|ceramic|block.print|dye|pinch/i,
    intent: "craft_technique",
    mood: "cozy_textured",
    actionability: "ready_to_attempt",
    materials: ["cotton", "clay"],
    techniques: ["dyeing", "hand-building"],
    colors: ["indigo", "natural", "earth"],
    era: null,
  },
  {
    match: /palette|swatch|paint|color/i,
    intent: "color_palette",
    mood: "warm_earthy",
    actionability: "reference_only",
    materials: [],
    techniques: [],
    colors: ["terracotta", "clay", "sage"],
    era: null,
  },
  {
    match: /soup|bread|sourdough|tart|salad|loaf/i,
    intent: "food",
    mood: "cozy_textured",
    actionability: "ready_to_attempt",
    materials: ["flour", "water"],
    techniques: ["baking"],
    colors: ["warm brown", "cream"],
    era: null,
  },
  {
    match: /kid|child|crib|toy|mobile/i,
    intent: "kid_project",
    mood: "soft_romantic",
    actionability: "reference_only",
    materials: ["wood", "felt"],
    techniques: [],
    colors: ["soft cream", "sage"],
    era: null,
  },
  {
    match: /skincare|hair|bottle/i,
    intent: "beauty_or_grooming",
    mood: "editorial_clean",
    actionability: "reference_only",
    materials: [],
    techniques: [],
    colors: ["amber", "cream"],
    era: null,
  },
  {
    match: /ink|watercolor|vase|sketch|painting/i,
    intent: "art_or_illustration",
    mood: "soft_romantic",
    actionability: "reference_only",
    materials: ["ink", "paper"],
    techniques: ["drawing"],
    colors: ["cream", "ink black"],
    era: null,
  },
  {
    match: /light|shadow|morning/i,
    intent: "photography_mood",
    mood: "editorial_clean",
    actionability: "reference_only",
    materials: [],
    techniques: [],
    colors: ["warm white", "shadow"],
    era: null,
  },
  {
    match: /village|grove|stone|street|place/i,
    intent: "travel_or_place",
    mood: "warm_earthy",
    actionability: "reference_only",
    materials: [],
    techniques: [],
    colors: ["stone", "olive"],
    era: null,
  },
  {
    match: /diy|macrame|block.print|dye/i,
    intent: "diy_project",
    mood: "cozy_textured",
    actionability: "ready_to_attempt",
    materials: ["cotton"],
    techniques: ["dyeing"],
    colors: ["indigo", "natural"],
    era: null,
  },
];

function pickPattern(text: string): Pattern {
  for (const p of PATTERNS) if (p.match.test(text)) return p;
  // fallback
  return {
    match: /./,
    intent: "general_aesthetic",
    mood: "warm_earthy",
    actionability: "reference_only",
    materials: [],
    techniques: [],
    colors: ["warm beige", "cream"],
    era: null,
  };
}

export const visionMock: VisionProvider = {
  async enrichPin(pin: PinForEnrichment): Promise<EnrichedPin> {
    const text = `${pin.pinterest_description ?? ""} ${pin.pinterest_board_name ?? ""}`;
    const p = pickPattern(text);
    // Tiny latency so the loading state feels real (1-3s for ~30 pins
    // when batched 10 at a time).
    await new Promise((r) => setTimeout(r, 60));

    const subject = (pin.pinterest_description ?? "saved pin")
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 4)
      .join(" ");

    return {
      intent_type: p.intent,
      primary_subject: subject,
      materials: p.materials,
      techniques: p.techniques,
      dominant_colors: p.colors,
      mood: p.mood,
      era_or_style: p.era,
      actionability: p.actionability,
      saved_signal_strength: 3,
      confidence: 0.7,
    };
  },
};
