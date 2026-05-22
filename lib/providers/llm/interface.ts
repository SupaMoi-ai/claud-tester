import type { EnrichedPin } from "@/lib/providers/vision/interface";
import type { Energy, IntentType } from "@/lib/supabase/types";

export interface EnrichedSeed extends EnrichedPin {
  pin_id: string;
}

export interface ProjectShape {
  label: string;
  explanation: string;
  intent_type: IntentType;
  dominant_palette: string[];
  included_pin_ids: string[]; // includes the seed
  excluded_pin_ids: string[];
  tiny_next_step: string | null;
  energy: Energy;
  confidence: number;
}

export interface WhisperShape {
  worth_whispering: boolean;
  whisper_text: string | null;
  reason: string;
}

export interface LLMProvider {
  buildProject(
    seed: EnrichedSeed,
    candidates: EnrichedSeed[]
  ): Promise<ProjectShape>;
  detectWhisper(samples: EnrichedSeed[]): Promise<WhisperShape>;
}

// Words the spec forbids in project labels.
export const FORBIDDEN_LABEL_WORDS = [
  "inspiration",
  "ideas",
  "vibes",
  "aesthetic",
  "mood",
  "collection",
  "board",
];

export function sanitiseLabel(raw: string): string {
  let s = raw.toLowerCase().trim();
  for (const w of FORBIDDEN_LABEL_WORDS) {
    s = s.replace(new RegExp(`\\b${w}\\b`, "g"), "").trim();
  }
  // collapse whitespace
  s = s.replace(/\s+/g, " ");
  return s || "saved things";
}
