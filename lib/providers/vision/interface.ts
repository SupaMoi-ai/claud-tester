import type {
  Actionability,
  IntentType,
  Mood,
} from "@/lib/supabase/types";

export interface PinForEnrichment {
  pinterest_pin_id: string;
  image_url: string;
  pinterest_description: string | null;
  pinterest_board_name: string | null;
}

export interface EnrichedPin {
  intent_type: IntentType;
  primary_subject: string;
  materials: string[];
  techniques: string[];
  dominant_colors: string[];
  mood: Mood;
  era_or_style: string | null;
  actionability: Actionability;
  saved_signal_strength: number;
  confidence: number;
}

export interface VisionProvider {
  enrichPin(pin: PinForEnrichment): Promise<EnrichedPin>;
}
