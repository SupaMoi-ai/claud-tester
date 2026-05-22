import type {
  EnrichedSeed,
  LLMProvider,
  ProjectShape,
  WhisperShape,
} from "./interface";
import { sanitiseLabel } from "./interface";

// Picks ~70% of candidates whose intent matches the seed, generates a
// concrete lowercase label from the seed's primary subject, and a soft
// tiny_next_step. Deterministic.

const NEXT_STEPS: Record<string, string> = {
  outfit_inspiration: "want to pick the one you'd actually wear?",
  garment_construction: "want to write down what you'd try first?",
  fabric_or_material: "want to pick your three favorite textures?",
  color_palette: "want to set this palette aside for the next project?",
  interior_styling: "want to pick one thing to start with?",
  diy_project: "want to write down what you'd need?",
  craft_technique: "want to try a tiny version first?",
  food: "want to plan one slow afternoon for this?",
  kid_project: "want to pick the one your kid would love most?",
  beauty_or_grooming: "want to set aside one to try this week?",
  art_or_illustration: "want to make a small study of one?",
  photography_mood: "want to keep this as a reference?",
  travel_or_place: "want to keep this somewhere quiet?",
  general_aesthetic: "want to come back to this when you're ready?",
  unclear: null as unknown as string,
};

export const llmMock: LLMProvider = {
  async buildProject(
    seed: EnrichedSeed,
    candidates: EnrichedSeed[]
  ): Promise<ProjectShape> {
    const included: string[] = [seed.pin_id];
    const excluded: string[] = [];

    for (const c of candidates) {
      const sameIntent = c.intent_type === seed.intent_type;
      const sameMood = c.mood === seed.mood;
      // Tighter than embedding alone: intent match is the gate.
      if (sameIntent && (sameMood || included.length < 6)) {
        included.push(c.pin_id);
      } else {
        excluded.push(c.pin_id);
      }
    }

    // Build a label from the seed's primary_subject — concrete, lowercase.
    const labelWords = seed.primary_subject
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 4);
    const label = sanitiseLabel(labelWords.join(" "));

    const palette = unique([
      ...seed.dominant_colors,
      ...candidates.flatMap((c) => c.dominant_colors),
    ]).slice(0, 3);

    const tinyNext = NEXT_STEPS[seed.intent_type] ?? null;

    const confidence =
      included.length >= 4 ? Math.min(0.85, 0.4 + included.length * 0.02) : 0.4;

    const explanation =
      included.length >= 4
        ? `these all feel like the ${labelWords[0] ?? "thing"} you keep coming back to`
        : "still a small one — keep saving to grow it";

    // simulated latency for the magic moment loading state
    await new Promise((r) => setTimeout(r, 400));

    return {
      label,
      explanation,
      intent_type: seed.intent_type,
      dominant_palette: palette,
      included_pin_ids: included,
      excluded_pin_ids: excluded,
      tiny_next_step: tinyNext,
      energy: included.length >= 6 ? "ready" : "growing",
      confidence,
    };
  },

  async detectWhisper(samples: EnrichedSeed[]): Promise<WhisperShape> {
    // Whisper only if the cluster is tight (>= 4 samples share an intent).
    if (samples.length < 5) {
      return {
        worth_whispering: false,
        whisper_text: null,
        reason: "too few samples",
      };
    }
    const intents = samples.map((s) => s.intent_type);
    const top = mode(intents);
    if (top.count < samples.length * 0.7) {
      return {
        worth_whispering: false,
        whisper_text: null,
        reason: "intent not coherent",
      };
    }
    const colors = unique(samples.flatMap((s) => s.dominant_colors)).slice(0, 1);
    const text = colors[0]
      ? `you've been saving a lot of ${colors[0]} things lately — want to start a project?`
      : "you've been saving a few similar things lately — want to make a small project from them?";
    return {
      worth_whispering: true,
      whisper_text: text,
      reason: `coherent ${top.value} cluster`,
    };
  },
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function mode<T>(arr: T[]): { value: T; count: number } {
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T = arr[0];
  let bestCount = 0;
  counts.forEach((c, v) => {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  });
  return { value: best, count: bestCount };
}
